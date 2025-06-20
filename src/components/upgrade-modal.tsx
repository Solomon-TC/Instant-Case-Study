"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Crown, Loader2, Tag } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { loadStripe } from "@stripe/stripe-js";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userId?: string;
}

// Validate and initialize Stripe
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error(
    "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable",
  );
}

const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

export default function UpgradeModal({
  isOpen,
  onClose,
  userEmail,
  userId,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          promoCode: promoCode.trim() || undefined,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Checkout session creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();

      if (!sessionId) {
        throw new Error("No session ID received from server");
      }

      // Load Stripe and redirect to checkout
      if (!stripePromise) {
        throw new Error(
          "Stripe is not properly configured. Missing publishable key.",
        );
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js failed to load");
      }

      console.log("Redirecting to Stripe checkout with session:", sessionId);
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error("Stripe redirectToCheckout error:", error);
        throw new Error(error.message || "Failed to redirect to checkout");
      }
    } catch (error) {
      console.error("Error during checkout process:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "Unlimited case study generation",
    "Priority AI processing",
    "Advanced export options",
    "Premium templates",
    "Email support",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            You've reached your free generation limit. Upgrade to Pro for
            unlimited access!
          </DialogDescription>
        </DialogHeader>

        <Card className="border-2 border-primary">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold">$9.99</div>
              <div className="text-sm text-gray-600">per month</div>
            </div>

            <ul className="space-y-2 mb-6">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="promo-code" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Promo Code (Optional)
          </Label>
          <Input
            id="promo-code"
            type="text"
            placeholder="Enter promo code (e.g., SUMMER25)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Start Checkout"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
