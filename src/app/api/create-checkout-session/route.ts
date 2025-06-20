import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Validate required environment variables at module level
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
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

// Initialize Stripe with latest API version
const stripe = new Stripe(requiredEnvVars.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil", // Use latest API version
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, promoCode, userId } = body;

    if (!email) {
      console.error("❌ Email is required for checkout session");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get the origin for success/cancel URLs
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    console.log(
      `🛒 Creating checkout session for ${email} with origin: ${origin}`,
    );

    let discounts = undefined;

    // Handle promo code validation if provided
    if (promoCode && promoCode.trim()) {
      try {
        console.log(`🏷️ Validating promo code: ${promoCode}`);

        // Search for active promotion code matching the provided code
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim(),
          active: true,
          limit: 1,
        });

        if (promoCodes.data.length > 0) {
          discounts = [{ promotion_code: promoCodes.data[0].id }];
          console.log(`✅ Valid promo code found: ${promoCode}`);
        } else {
          console.log(`❌ Invalid or inactive promo code: ${promoCode}`);
          return NextResponse.json(
            { error: "Invalid or expired promo code" },
            { status: 400 },
          );
        }
      } catch (promoError) {
        const errorMessage =
          promoError instanceof Error ? promoError.message : "Unknown error";
        console.error("❌ Error validating promo code:", errorMessage);
        return NextResponse.json(
          { error: "Failed to validate promo code" },
          { status: 400 },
        );
      }
    }

    // Prepare session metadata
    const metadata: Record<string, string> = {
      email: email,
    };

    if (userId) {
      metadata.user_id = userId;
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: requiredEnvVars.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      automatic_tax: {
        enabled: true,
      },
      metadata: metadata,
      allow_promotion_codes: !promoCode, // Allow promotion codes if none provided
      billing_address_collection: "auto",
      payment_method_types: ["card"],
      subscription_data: {
        metadata: metadata,
      },
    };

    // Add discounts if promo code was validated
    if (discounts) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Checkout session created successfully: ${session.id}`);
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error creating checkout session:", errorMessage);

    // Log additional error details for debugging
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
