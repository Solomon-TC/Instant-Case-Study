"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser, sessionUtils } from "@/lib/supabase-browser";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] =
    useState<string>("Initializing...");
  const supabase = supabaseBrowser;

  // Enhanced user profile handler with retry logic
  const handleUserProfile = useCallback(
    async (user: any, retryCount = 0): Promise<boolean> => {
      const maxRetries = 3;
      try {
        console.log(
          `🔄 Handling user profile for: ${user.email} (attempt ${retryCount + 1})`,
        );
        setProcessingStep(`Creating user profile...`);

        // Wait a bit to ensure database is ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if user exists with retry logic
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .eq("is_deleted", false)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          // User doesn't exist, create new profile
          console.log("📝 Creating new user profile...");
          const { error: createError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email || "",
            is_pro: false,
            generation_count: 0,
            is_deleted: false,
          });

          if (createError) {
            console.error("❌ Error creating user profile:", createError);
            if (retryCount < maxRetries) {
              console.log(
                `🔄 Retrying user profile creation (${retryCount + 1}/${maxRetries})`,
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return await handleUserProfile(user, retryCount + 1);
            }
            // Don't fail the auth flow for profile creation errors
            console.log("⚠️ Profile creation failed, but continuing with auth");
            return true;
          } else {
            console.log("✅ User profile created successfully");
            return true;
          }
        } else if (!fetchError && existingUser) {
          console.log("✅ Existing user profile found");
          return true;
        } else if (fetchError) {
          console.error("❌ Error fetching user profile:", fetchError);
          if (retryCount < maxRetries) {
            console.log(
              `🔄 Retrying user profile fetch (${retryCount + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return await handleUserProfile(user, retryCount + 1);
          }
          // Don't fail the auth flow for profile fetch errors
          console.log("⚠️ Profile fetch failed, but continuing with auth");
          return true;
        }
        return true;
      } catch (profileError) {
        console.error("❌ Profile handling error:", profileError);
        if (retryCount < maxRetries) {
          console.log(
            `🔄 Retrying profile handling (${retryCount + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return await handleUserProfile(user, retryCount + 1);
        }
        // Don't fail the auth flow for profile errors
        console.log("⚠️ Profile handling failed, but continuing with auth");
        return true;
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (isProcessing) return; // Prevent multiple simultaneous processing

    const handleAuthCallback = async () => {
      setIsProcessing(true);
      setProcessingStep("Processing OAuth callback...");

      try {
        console.log("🔄 Processing OAuth callback...");

        // Collect debug information
        const currentUrl = window.location.href;
        const urlParams = Object.fromEntries(searchParams.entries());
        const urlHash = window.location.hash;

        const debugData = {
          url: currentUrl,
          params: urlParams,
          hash: urlHash,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer,
        };

        setDebugInfo(debugData);
        console.log("🔍 Debug info:", debugData);

        // Check for OAuth errors in URL params first
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
          console.error("❌ OAuth error in URL:", errorParam, errorDescription);
          const decodedError = decodeURIComponent(
            errorDescription || errorParam || "Authentication failed",
          );
          setError(decodedError);
          setStatus("error");
          setIsProcessing(false);
          return;
        }

        setProcessingStep("Checking for existing session...");

        // First, try to get session from URL (handles both PKCE and implicit flows)
        console.log("🔄 Attempting to get session from URL...");
        const { data: urlSessionData, error: urlSessionError } =
          await supabase.auth.getSession();

        if (urlSessionData?.session?.user) {
          console.log(
            "✅ Session found from URL:",
            urlSessionData.session.user.email,
          );

          setProcessingStep("Setting up user profile...");
          const profileSuccess = await handleUserProfile(
            urlSessionData.session.user,
          );

          if (profileSuccess) {
            setStatus("success");
            setProcessingStep("Redirecting to dashboard...");

            // Clean up URL and redirect with enhanced timing
            window.history.replaceState({}, document.title, "/auth/callback");

            // Wait longer to ensure everything is properly set up
            setTimeout(() => {
              console.log("🔄 Redirecting to app...");
              window.location.href = "/app";
            }, 2000);

            setIsProcessing(false);
            return;
          }
        }

        // Check for authorization code (PKCE flow)
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (code) {
          console.log(
            "✅ Authorization code found:",
            code.substring(0, 10) + "...",
          );
          console.log("🔐 State parameter:", state);

          try {
            setProcessingStep("Exchanging authorization code...");

            // Exchange authorization code for session with retry logic
            console.log("🔄 Exchanging code for session...");
            let sessionData = null;
            let exchangeError = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
              const result = await supabase.auth.exchangeCodeForSession(code);
              sessionData = result.data;
              exchangeError = result.error;

              if (!exchangeError && sessionData?.session?.user) {
                console.log(
                  `✅ Code exchange successful on attempt ${attempt}`,
                );
                break;
              }

              if (attempt < 3) {
                console.log(
                  `⏳ Code exchange attempt ${attempt} failed, retrying...`,
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }

            if (exchangeError) {
              console.error("❌ Code exchange error:", exchangeError);
              setError(
                `Failed to complete authentication: ${exchangeError.message}`,
              );
              setStatus("error");
              setIsProcessing(false);
              return;
            }

            if (!sessionData?.session?.user) {
              console.error("❌ No session data after code exchange");
              setError("Authentication failed - no session created");
              setStatus("error");
              setIsProcessing(false);
              return;
            }

            console.log(
              "✅ Session created for user:",
              sessionData.session.user.email,
            );

            // Wait for session to be fully established
            setProcessingStep("Establishing session...");
            await sessionUtils.waitForSession(5, 1000);

            // Create or update user profile
            setProcessingStep("Setting up user profile...");
            const profileSuccess = await handleUserProfile(
              sessionData.session.user,
            );

            if (profileSuccess) {
              setStatus("success");
              setProcessingStep("Redirecting to dashboard...");

              // Clean up URL and redirect with enhanced timing
              window.history.replaceState({}, document.title, "/auth/callback");

              // Wait longer to ensure everything is properly set up
              setTimeout(() => {
                console.log("🔄 Redirecting to app...");
                window.location.href = "/app";
              }, 2500);

              setIsProcessing(false);
              return;
            }
          } catch (codeExchangeError) {
            console.error("❌ Code exchange failed:", codeExchangeError);
            setError("Failed to complete Google sign-in. Please try again.");
            setStatus("error");
            setIsProcessing(false);
            return;
          }
        }

        // Handle implicit flow (hash fragments) - fallback
        if (
          urlHash &&
          (urlHash.includes("access_token") || urlHash.includes("id_token"))
        ) {
          console.log("🔄 Handling implicit flow with hash fragments...");

          try {
            // Wait a bit for Supabase to process the hash
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Let Supabase handle the hash fragments
            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();

            if (sessionError) {
              console.error("❌ Session error:", sessionError);
              setError(sessionError.message);
              setStatus("error");
              setIsProcessing(false);
              return;
            }

            if (sessionData?.session?.user) {
              console.log(
                "✅ Session found for user:",
                sessionData.session.user.email,
              );

              await handleUserProfile(sessionData.session.user);
              setStatus("success");

              setTimeout(() => {
                window.location.href = "/app";
              }, 1500);

              setIsProcessing(false);
              return;
            }
          } catch (implicitError) {
            console.error("❌ Implicit flow error:", implicitError);
            setError("Failed to process authentication. Please try again.");
            setStatus("error");
            setIsProcessing(false);
            return;
          }
        }

        // Enhanced final fallback with comprehensive session establishment
        console.log("🔄 Enhanced final session check...");
        setProcessingStep("Performing final session check...");

        // Try to wait for session with enhanced retry logic
        try {
          const finalSession = await sessionUtils.waitForSession(15, 1000);

          if (finalSession?.user) {
            console.log(
              "✅ Final session found for user:",
              finalSession.user.email,
            );

            setProcessingStep("Setting up user profile...");
            const profileSuccess = await handleUserProfile(finalSession.user);

            if (profileSuccess) {
              setStatus("success");
              setProcessingStep("Redirecting to dashboard...");

              // Clean up URL and redirect with enhanced timing
              window.history.replaceState({}, document.title, "/auth/callback");

              setTimeout(() => {
                console.log("🔄 Final redirect to app...");
                window.location.href = "/app";
              }, 2500);

              setIsProcessing(false);
              return;
            }
          }
        } catch (sessionError) {
          console.error("❌ Enhanced session check error:", sessionError);
        }

        // If we get here, no valid authentication was found
        console.error("❌ No valid authentication found after all attempts");
        setError("Authentication failed. Please try signing in again.");
        setStatus("error");
        setIsProcessing(false);
      } catch (error) {
        console.error("❌ Unexpected callback error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during authentication",
        );
        setStatus("error");
        setIsProcessing(false);
      }
    };

    // Start the callback handling process
    handleAuthCallback();
  }, [searchParams, router, supabase, handleUserProfile, isProcessing]);

  const handleRetry = () => {
    console.log("🔄 Retrying authentication...");
    router.push("/app");
  };

  const handleBackToLogin = () => {
    console.log("🔄 Going back to login...");
    router.push("/");
  };

  const handleShowDebug = () => {
    console.log("🔍 Debug information:", debugInfo);
    alert(JSON.stringify(debugInfo, null, 2));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Completing Sign In
              </h2>
              <p className="text-gray-600 mb-2">
                Please wait while we complete your Google sign in...
              </p>
              <p className="text-sm text-gray-500">{processingStep}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign In Successful!
              </h2>
              <p className="text-gray-600">
                Redirecting you to your dashboard...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign In Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {error || "An error occurred during authentication"}
              </p>
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button
                  onClick={handleBackToLogin}
                  variant="outline"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
                <Button
                  onClick={handleShowDebug}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Show Debug Info
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
