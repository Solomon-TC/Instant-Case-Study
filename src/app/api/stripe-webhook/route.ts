import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 },
      );
    }

    // Parse the webhook payload
    let event;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error("Error parsing webhook body:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const customerEmail = session.customer_email;

        if (customerEmail) {
          // Find user by email and update their pro status
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", customerEmail)
            .single();

          if (userError) {
            console.error("Error finding user:", userError);
            break;
          }

          if (user) {
            const { error: updateError } = await supabase
              .from("users")
              .update({
                is_pro: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (updateError) {
              console.error("Error updating user pro status:", updateError);
            } else {
              console.log(`Updated user ${user.id} to pro status`);
            }
          }
        }
        break;

      case "customer.subscription.deleted":
        // Handle subscription cancellation
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // You would need to store customer ID to map back to user
        // For now, we'll skip this implementation
        console.log("Subscription cancelled for customer:", customerId);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
