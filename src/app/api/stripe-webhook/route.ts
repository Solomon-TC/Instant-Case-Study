import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Next.js App Router configuration
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const runtime = "nodejs";

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_KEY environment variable");
}

// Initialize Stripe with API version 2025-05-28.basil
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Initialize Supabase Admin client for database operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { persistSession: false },
  },
);

// Helper function to update user in Supabase
async function updateUser(userId: string | null) {
  if (!userId) {
    throw new Error("Cannot update user: userId is null or undefined");
  }
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      is_pro: true,
      generation_count: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("❌ Error updating user is_pro status:", error);
    throw error;
  }

  console.log(`✅ Successfully updated user ${userId} to pro status`);
}

// Helper function to find user by email
async function findUserByEmail(
  email: string | null | undefined,
): Promise<string | null> {
  // Return null if email is null, undefined, or empty string
  if (!email || email.trim() === "") {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Error finding user by email:", error);
    return null;
  }

  return data?.id ?? null;
}

// Type guard to check if email is a valid string
function isValidEmail(email: string | null | undefined): email is string {
  return typeof email === "string" && email.trim().length > 0;
}

// Helper function to safely extract subscription ID from invoice
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // Use type assertion to access subscription property safely
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };

  if (!invoiceWithSubscription.subscription) {
    return null;
  }

  if (typeof invoiceWithSubscription.subscription === "string") {
    return invoiceWithSubscription.subscription;
  }

  if (
    typeof invoiceWithSubscription.subscription === "object" &&
    invoiceWithSubscription.subscription?.id
  ) {
    return invoiceWithSubscription.subscription.id;
  }

  return null;
}

// Helper function to safely extract customer ID from any Stripe object
function getCustomerIdFromStripeObject(obj: {
  customer?: string | Stripe.Customer | null;
}): string | null {
  if (!obj.customer) {
    return null;
  }

  if (typeof obj.customer === "string") {
    return obj.customer;
  }

  if (typeof obj.customer === "object" && obj.customer?.id) {
    return obj.customer.id;
  }

  return null;
}

// Helper function to safely get user ID from customer email
async function getUserIdFromCustomer(
  customerId: string,
): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && isValidEmail(customer.email)) {
      return await findUserByEmail(customer.email);
    }
  } catch (error) {
    console.error("Error retrieving customer from Stripe:", error);
  }
  return null;
}

/**
 * Stripe Webhook Handler
 * Handles all relevant Stripe subscription and payment events
 * Updates user's pro status in Supabase database
 */
export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  // Read raw body as text for signature verification
  const body = await request.text();

  // Get Stripe signature header
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("⚠️ Missing stripe-signature header");
    return new NextResponse(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400 },
    );
  }

  // Verify webhook signature to ensure request is from Stripe
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
    console.log(`📨 Received webhook event: ${event.type} (ID: ${event.id})`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("⚠️ Webhook signature verification failed:", errorMessage);
    return new NextResponse(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400 },
    );
  }

  // Handle relevant event types
  const relevantEvents = new Set([
    "checkout.session.completed",
    "invoice.paid",
    "customer.subscription.updated",
    "customer.subscription.created",
  ]);

  if (!relevantEvents.has(event.type)) {
    // Ignore other events
    console.log(`ℹ️ Ignoring event type: ${event.type}`);
    return new NextResponse("OK", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Safely extract customer ID using helper function
        const customerId = getCustomerIdFromStripeObject(session);
        let userId: string | null =
          session.metadata?.supabase_user_id ||
          session.metadata?.user_id ||
          null;

        // If no user_id in metadata, try to find user by customer email
        if (!userId && customerId) {
          userId = await getUserIdFromCustomer(customerId);
        }

        if (!userId) {
          console.error(
            "❌ User ID not found for checkout.session.completed. Customer:",
            customerId,
            "Metadata:",
            session.metadata,
          );
          // Don't throw error, just log and continue
          break;
        }

        await updateUser(userId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // Safely extract subscription ID using helper function
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        // Safely extract customer ID using helper function
        const customerId = getCustomerIdFromStripeObject(invoice);

        if (!subscriptionId) {
          console.error("❌ No subscription ID in invoice.paid event");
          break;
        }

        // Get subscription to check metadata and status
        try {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);

          // Only process if subscription is active or trialing
          if (
            subscription.status !== "active" &&
            subscription.status !== "trialing"
          ) {
            console.log(
              `ℹ️ Ignoring invoice.paid for subscription with status: ${subscription.status}`,
            );
            break;
          }

          let userId: string | null =
            subscription.metadata?.supabase_user_id ||
            subscription.metadata?.user_id ||
            null;

          // If no user_id in subscription metadata, try to find user by customer email
          if (!userId && customerId) {
            userId = await getUserIdFromCustomer(customerId);
          }

          if (!userId) {
            console.error(
              "❌ User ID not found for invoice.paid. Customer:",
              customerId,
              "Subscription:",
              subscriptionId,
            );
            break;
          }

          await updateUser(userId);
        } catch (error) {
          console.error("Error retrieving subscription:", error);
          throw error;
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        // Safely extract customer ID using helper function
        const customerId = getCustomerIdFromStripeObject(subscription);

        // Only process if subscription is active or trialing
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          console.log(
            `ℹ️ Ignoring ${event.type} for subscription with status: ${subscription.status}`,
          );
          break;
        }

        let userId: string | null =
          subscription.metadata?.supabase_user_id ||
          subscription.metadata?.user_id ||
          null;

        // If no user_id in metadata, try to find user by customer email
        if (!userId && customerId) {
          userId = await getUserIdFromCustomer(customerId);
        }

        if (!userId) {
          console.error(
            `❌ User ID not found for ${event.type}. Customer:`,
            customerId,
            "Subscription metadata:",
            subscription.metadata,
          );
          break;
        }

        await updateUser(userId);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always respond with 200 status to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `❌ Error processing webhook event ${event.type}:`,
      errorMessage,
    );
    return new NextResponse(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500 },
    );
  }
}
