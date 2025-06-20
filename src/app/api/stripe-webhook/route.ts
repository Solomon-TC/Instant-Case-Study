import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Next.js App Router configuration
export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const runtime = "nodejs";

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Initialize Supabase Admin client for database operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);

/**
 * Stripe Webhook Handler
 * Handles checkout.session.completed and invoice.paid events
 * Updates user's pro status in Supabase database
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  // Verify webhook signature to ensure request is from Stripe
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`📨 Received webhook event: ${event.type}`);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;
    const userId = session.metadata?.user_id; // Check for user ID in metadata

    console.log(
      `🛒 Processing checkout completion for email: ${email}, user_id: ${userId}`,
    );

    if (email || userId) {
      try {
        let query = supabaseAdmin.from("users").update({ is_pro: true });

        // Update by email or user_id based on what's available
        if (userId) {
          query = query.eq("id", userId);
        } else {
          query = query.eq("email", email);
        }

        const { error, data } = await query;

        if (error) {
          console.error("❌ Error updating user in Supabase:", error);
          return new Response("Database update failed", { status: 500 });
        } else {
          console.log(
            `✅ Successfully updated user ${email || userId} to pro status`,
          );
        }
      } catch (error) {
        console.error("❌ Unexpected error updating user in Supabase:", error);
        return new Response("Internal server error", { status: 500 });
      }
    } else {
      console.error("❌ No email or user_id found in checkout session");
      return new Response("Missing customer information", { status: 400 });
    }
  }

  // Handle invoice.paid event (for subscription renewals)
  else if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    console.log(`💳 Processing invoice payment for customer: ${customerId}`);

    try {
      // Get customer details from Stripe
      const customer = (await stripe.customers.retrieve(
        customerId,
      )) as Stripe.Customer;
      const email = customer.email;

      if (email) {
        const { error, data } = await supabaseAdmin
          .from("users")
          .update({ is_pro: true })
          .eq("email", email);

        if (error) {
          console.error(
            "❌ Error updating user in Supabase for invoice payment:",
            error,
          );
          return new Response("Database update failed", { status: 500 });
        } else {
          console.log(
            `✅ Successfully updated user ${email} to pro status (invoice paid)`,
          );
        }
      } else {
        console.error("❌ No email found for customer in invoice.paid event");
        return new Response("Missing customer email", { status: 400 });
      }
    } catch (error) {
      console.error("❌ Error processing invoice.paid event:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }

  // Log unhandled event types for debugging
  else {
    console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  // Always respond with 200 status to acknowledge receipt
  return new Response("Webhook received", { status: 200 });
}
