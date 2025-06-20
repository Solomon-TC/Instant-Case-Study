import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parsing to handle raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);

async function buffer(readable: ReadableStream<Uint8Array>) {
  const chunks: Uint8Array[] = [];
  const reader = readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req.body!);
    const signature = req.headers.get("stripe-signature")!;

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err);
    // Return 200 to avoid repeated webhook attempts
    return NextResponse.json({ received: true }, { status: 200 });
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
  return NextResponse.json({ received: true }, { status: 200 });
}
