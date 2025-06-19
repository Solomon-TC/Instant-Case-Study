"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Simulate a brief loading period to allow webhook processing
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your upgrade...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Welcome to Pro!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your subscription has been activated successfully. You now have
            unlimited access to case study generation!
          </p>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              What's included:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✓ Unlimited case study generation</li>
              <li>✓ Priority AI processing</li>
              <li>✓ Advanced export options</li>
              <li>✓ Premium templates</li>
              <li>✓ Email support</li>
            </ul>
          </div>

          <Button onClick={handleContinue} className="w-full" size="lg">
            Start Creating Case Studies
          </Button>

          {sessionId && (
            <p className="text-xs text-gray-500">Session ID: {sessionId}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
