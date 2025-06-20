import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const preferredRegion = "home";
export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;

    if (email) {
      try {
        const { error } = await supabaseAdmin
          .from("users")
          .update({ is_pro: true })
          .eq("email", email);

        if (error) {
          console.error("Error updating user in Supabase:", error);
        } else {
          console.log(`✅ Successfully updated user ${email} to pro status`);
        }
      } catch (error) {
        console.error("Unexpected error updating user in Supabase:", error);
      }
    } else {
      console.error("No email found in checkout session.");
    }
  }

  // Always respond with 200 status to acknowledge receipt
  return new Response("Webhook received", { status: 200 });
}
