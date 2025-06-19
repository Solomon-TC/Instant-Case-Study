import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create checkout session using Pica passthrough
    const checkoutBody = new URLSearchParams({
      "automatic_tax[enabled]": "true",
      "line_items[0][price]": "price_1QYlGhP8eZXaOcBgmjQZQoVx",
      "line_items[0][quantity]": "1",
      mode: "subscription",
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/`,
    });

    const response = await fetch(
      "https://api.picaos.com/v1/passthrough/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-pica-secret": process.env.PICA_SECRET_KEY!,
          "x-pica-connection-key": process.env.PICA_STRIPE_CONNECTION_KEY!,
          "x-pica-action-id":
            "conn_mod_def::GCmLNSLWawg::Pj6pgAmnQhuqMPzB8fquRg",
        },
        body: checkoutBody.toString(),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stripe API error:", errorText);
      throw new Error(`Stripe API error: ${response.statusText}`);
    }

    const session = await response.json();

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
