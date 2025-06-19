import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!stripeSecretKey || !stripePriceId || !stripePublishableKey) {
      console.error("Missing Stripe environment variables:", {
        hasSecretKey: !!stripeSecretKey,
        hasPriceId: !!stripePriceId,
        hasPublishableKey: !!stripePublishableKey,
      });
      return NextResponse.json(
        { error: "Stripe environment variables are not properly configured" },
        { status: 500 },
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const body = await request.json();
    const { email, promoCode } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get("origin") || request.nextUrl.origin;

    let discounts = undefined;

    // Handle promo code validation if provided
    if (promoCode && promoCode.trim()) {
      try {
        // Search for active promotion code matching the provided code
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim(),
          active: true,
          limit: 1,
        });

        if (promoCodes.data.length > 0) {
          discounts = [{ promotion_code: promoCodes.data[0].id }];
          console.log("Valid promo code found:", promoCode);
        } else {
          console.log("Invalid or inactive promo code:", promoCode);
          return NextResponse.json(
            { error: "Invalid or expired promo code" },
            { status: 400 },
          );
        }
      } catch (promoError) {
        console.error("Error validating promo code:", promoError);
        return NextResponse.json(
          { error: "Failed to validate promo code" },
          { status: 400 },
        );
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      automatic_tax: {
        enabled: true,
      },
      ...(discounts && { discounts }),
    });

    console.log("Checkout session created successfully:", session.id);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
