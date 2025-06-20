import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// ✅ Use the correct supported API version from Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🟡 Stripe Checkout Request Body:", body);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!baseUrl || !priceId) {
      console.error("❌ Missing environment variables.");
      return new NextResponse("Missing environment variables", { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/`,
      // Optional: add metadata if user_id is available
      metadata: body?.user_id ? { user_id: body.user_id } : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error.message || error);
    return new NextResponse("Failed to create checkout session", {
      status: 500,
    });
  }
}
