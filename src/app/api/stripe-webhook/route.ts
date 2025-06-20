import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Next.js App Router configuration
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const runtime = "nodejs";

// Validate required environment variables
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}

// Initialize Stripe with stable API version
const stripe = new Stripe(requiredEnvVars.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16", // Use stable API version
});

// Initialize Supabase Admin client for database operations
const supabaseAdmin = createClient(
  requiredEnvVars.SUPABASE_URL!,
  requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);

/**
 * Stripe Webhook Handler
 * Handles all relevant Stripe subscription and payment events
 * Updates user's pro status in Supabase database
 */
export async function POST(req: NextRequest) {
  const webhookSecret = requiredEnvVars.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  // Verify webhook signature to ensure request is from Stripe
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("⚠️ Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`📨 Received webhook event: ${event.type} (ID: ${event.id})`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("⚠️ Webhook signature verification failed:", errorMessage);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always respond with 200 status to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `❌ Error processing webhook event ${event.type}:`,
      errorMessage,
    );
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

// Helper function to handle checkout completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email;
  const customerId = session.customer as string;
  const userId = session.metadata?.user_id;

  console.log(
    `🛒 Processing checkout completion - Email: ${email}, Customer: ${customerId}, User ID: ${userId}`,
  );

  if (!email && !userId) {
    throw new Error("No email or user_id found in checkout session");
  }

  // Update user pro status and store Stripe customer ID
  const updateData: any = {
    is_pro: true,
    updated_at: new Date().toISOString(),
  };

  if (customerId) {
    updateData.stripe_customer_id = customerId;
  }

  let query = supabaseAdmin.from("users").update(updateData);

  // Update by user_id first (more reliable), then by email
  if (userId) {
    query = query.eq("id", userId);
  } else {
    query = query.eq("email", email);
  }

  const { error, data } = await query.select();

  if (error) {
    console.error("❌ Error updating user in Supabase:", error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`⚠️ No user found to update for ${email || userId}`);
    throw new Error("User not found in database");
  }

  console.log(`✅ Successfully updated user ${email || userId} to pro status`);
}

// Helper function to handle invoice payments
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log(`💳 Processing invoice payment for customer: ${customerId}`);

  if (!customerId) {
    throw new Error("No customer ID found in invoice");
  }

  // Get customer details from Stripe
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    throw new Error("Customer has been deleted");
  }

  const email = (customer as Stripe.Customer).email;

  if (!email) {
    throw new Error("No email found for customer");
  }

  const { error, data } = await supabaseAdmin
    .from("users")
    .update({
      is_pro: true,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select();

  if (error) {
    console.error("❌ Error updating user for invoice payment:", error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`⚠️ No user found for email: ${email}`);
    throw new Error("User not found in database");
  }

  console.log(
    `✅ Successfully updated user ${email} to pro status (invoice paid)`,
  );
}

// Helper function to handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const isActive = ["active", "trialing"].includes(subscription.status);

  console.log(
    `🔄 Processing subscription update - Customer: ${customerId}, Status: ${subscription.status}, Active: ${isActive}`,
  );

  if (!customerId) {
    throw new Error("No customer ID found in subscription");
  }

  const { error, data } = await supabaseAdmin
    .from("users")
    .update({
      is_pro: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (error) {
    console.error("❌ Error updating user subscription status:", error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`⚠️ No user found for customer: ${customerId}`);
    throw new Error("User not found in database");
  }

  console.log(
    `✅ Successfully updated subscription status for customer ${customerId} to ${isActive ? "active" : "inactive"}`,
  );
}

// Helper function to handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log(
    `❌ Processing subscription cancellation for customer: ${customerId}`,
  );

  if (!customerId) {
    throw new Error("No customer ID found in subscription");
  }

  const { error, data } = await supabaseAdmin
    .from("users")
    .update({
      is_pro: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (error) {
    console.error("❌ Error updating user subscription cancellation:", error);
    throw new Error(`Database update failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`⚠️ No user found for customer: ${customerId}`);
    throw new Error("User not found in database");
  }

  console.log(
    `✅ Successfully cancelled subscription for customer ${customerId}`,
  );
}

// Helper function to handle payment failures
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log(`💳❌ Processing payment failure for customer: ${customerId}`);

  if (!customerId) {
    throw new Error("No customer ID found in invoice");
  }

  // For now, just log the payment failure
  // You might want to send an email notification or take other actions
  console.log(
    `⚠️ Payment failed for customer ${customerId}, invoice ${invoice.id}`,
  );

  // Optionally, you could update a payment_failed flag or send notifications
  // For this implementation, we'll just log it
}
