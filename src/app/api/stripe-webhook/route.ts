import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Next.js App Router configuration
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const runtime = "nodejs";

// Helper function to validate and get environment variables at runtime
function getRequiredEnvVars(): {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
} {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use SUPABASE_SERVICE_ROLE_KEY to match other API routes
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const missing = [];
  if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!stripeWebhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey)
    missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // TypeScript now knows these are defined due to the validation above
  return {
    stripeSecretKey: stripeSecretKey!,
    stripeWebhookSecret: stripeWebhookSecret!,
    supabaseUrl: supabaseUrl!,
    supabaseServiceKey: supabaseServiceKey!,
  };
}

// Initialize clients lazily to avoid build-time errors
let stripe: Stripe | null = null;
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

function getStripeClient() {
  if (!stripe) {
    const { stripeSecretKey } = getRequiredEnvVars();
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-05-28.basil",
    });
  }
  return stripe;
}

function getSupabaseClient() {
  if (!supabaseAdmin) {
    const { supabaseUrl, supabaseServiceKey } = getRequiredEnvVars();
    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdmin;
}

// Helper function to update user in Supabase
async function updateUser(userId: string | null) {
  if (!userId) {
    throw new Error("Cannot update user: userId is null or undefined");
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase
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

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
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
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
}): string | null {
  if (!obj.customer) {
    return null;
  }

  if (typeof obj.customer === "string") {
    return obj.customer;
  }

  // Check if customer is an object and has an id property
  if (typeof obj.customer === "object" && obj.customer?.id) {
    // Additional check to ensure it's not a DeletedCustomer
    // DeletedCustomer has 'deleted: true' property, while Customer doesn't
    if ("deleted" in obj.customer && obj.customer.deleted === true) {
      // This is a DeletedCustomer, return null
      return null;
    }
    return obj.customer.id;
  }

  return null;
}

// Helper function to safely get user ID from customer email
async function getUserIdFromCustomer(
  customerId: string,
): Promise<string | null> {
  try {
    const stripeClient = getStripeClient();
    const customer = await stripeClient.customers.retrieve(customerId);
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

  try {
    // Validate environment variables at request time
    const { stripeWebhookSecret } = getRequiredEnvVars();
    const stripeClient = getStripeClient();

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
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret,
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
          const stripeClient = getStripeClient();
          const subscription =
            await stripeClient.subscriptions.retrieve(subscriptionId);

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
    console.error(`❌ Error processing webhook event:`, errorMessage);
    return new NextResponse(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500 },
    );
  }
}
