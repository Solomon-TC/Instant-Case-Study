import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Validate required environment variables at module level
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !NEXT_PUBLIC_BASE_URL) {
  console.error("Missing required environment variables:", {
    STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: !!STRIPE_PRICE_ID,
    NEXT_PUBLIC_BASE_URL: !!NEXT_PUBLIC_BASE_URL,
  });
  throw new Error(
    "Missing required environment variables: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, NEXT_PUBLIC_BASE_URL",
  );
}

console.log("Environment variables loaded (excluding secrets):", {
  STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID: !!STRIPE_PRICE_ID,
  NEXT_PUBLIC_BASE_URL: NEXT_PUBLIC_BASE_URL,
});

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🟡 Stripe Checkout Request Body:", body);

    const { userId, promoCode } = body;
    console.log("Extracted values:", { userId, promoCode });

    let discounts = undefined;

    // Handle promo code if provided
    if (promoCode) {
      try {
        console.log(`Attempting to apply promo code: ${promoCode}`);
        // Retrieve promotion code object by code string
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          discounts = [{ promotion_code: promotionCodes.data[0].id }];
          console.log(
            `✅ Promotion code applied: ${promoCode} (ID: ${promotionCodes.data[0].id})`,
          );
        } else {
          console.warn(`⚠️ Promotion code not found or inactive: ${promoCode}`);
        }
      } catch (promoErr: any) {
        console.warn(
          "⚠️ Error retrieving promotion code:",
          promoErr.message || promoErr,
        );
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${NEXT_PUBLIC_BASE_URL}/`,
      metadata: userId ? { userId } : undefined,
      discounts,
    };

    console.log("Creating Stripe session with params:", {
      ...sessionParams,
      line_items: sessionParams.line_items,
      discounts: sessionParams.discounts,
      metadata: sessionParams.metadata,
    });

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ Stripe session created successfully: ${session.id}`);
    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("❌ Session creation failed:", error.message || error);
    return NextResponse.json(
      { error: "Session creation failed" },
      { status: 500 },
    );
  }
}
