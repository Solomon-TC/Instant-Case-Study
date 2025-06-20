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
    // Helper function to update user in Supabase
    async function updateUser(userId: string) {
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
    async function findUserByEmail(email: string): Promise<string | null> {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          // PGRST116 = no rows found
          console.error("Error finding user by email:", error);
        }
        return null;
      }
      return data?.id ?? null;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | undefined;
        let userId =
          session.metadata?.supabase_user_id || session.metadata?.user_id;

        // If no user_id in metadata, try to find user by customer email
        if (!userId && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted && (customer as Stripe.Customer).email) {
              const email = (customer as Stripe.Customer).email!;
              userId = await findUserByEmail(email);
            }
          } catch (error) {
            console.error("Error retrieving customer from Stripe:", error);
          }
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
        const subscriptionId = invoice.subscription as string | null;
        const customerId = invoice.customer as string | undefined;

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

          let userId =
            subscription.metadata?.supabase_user_id ||
            subscription.metadata?.user_id;

          // If no user_id in subscription metadata, try to find user by customer email
          if (!userId && customerId) {
            try {
              const customer = await stripe.customers.retrieve(customerId);
              if (!customer.deleted && (customer as Stripe.Customer).email) {
                const email = (customer as Stripe.Customer).email!;
                userId = await findUserByEmail(email);
              }
            } catch (error) {
              console.error("Error retrieving customer from Stripe:", error);
            }
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
        const customerId = subscription.customer as string;

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

        let userId =
          subscription.metadata?.supabase_user_id ||
          subscription.metadata?.user_id;

        // If no user_id in metadata, try to find user by customer email
        if (!userId && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted && (customer as Stripe.Customer).email) {
              const email = (customer as Stripe.Customer).email!;
              userId = await findUserByEmail(email);
            }
          } catch (error) {
            console.error("Error retrieving customer from Stripe:", error);
          }
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
