import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Helper function to validate and get environment variables at runtime
function getRequiredEnvVars(): {
  stripeSecretKey: string;
  stripePriceId: string;
  baseUrl: string;
} {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const missing = [];
  if (!stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!stripePriceId) missing.push("STRIPE_PRICE_ID");
  if (!baseUrl) missing.push("NEXT_PUBLIC_BASE_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    stripeSecretKey: stripeSecretKey!,
    stripePriceId: stripePriceId!,
    baseUrl: baseUrl!,
  };
}

// Initialize Stripe client lazily to avoid build-time errors
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripe) {
    const { stripeSecretKey } = getRequiredEnvVars();
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-05-28.basil",
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables at request time
    const { stripePriceId, baseUrl } = getRequiredEnvVars();
    const stripeClient = getStripeClient();

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
        const promotionCodes = await stripeClient.promotionCodes.list({
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
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/`,
      metadata: userId ? { userId } : undefined,
      discounts,
    };

    console.log("Creating Stripe session with params:", {
      ...sessionParams,
      line_items: sessionParams.line_items,
      discounts: sessionParams.discounts,
      metadata: sessionParams.metadata,
    });

    const session = await stripeClient.checkout.sessions.create(sessionParams);

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
