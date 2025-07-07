"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Mail, Loader2, Eye, EyeOff } from "lucide-react";

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

function AuthFormClient({ onAuthSuccess }: AuthFormProps = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = supabaseBrowser;

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoized auth success handler
  const handleAuthSuccess = useCallback(() => {
    console.log("✅ Auth success callback triggered");
    setIsGoogleLoading(false);
    setIsLoading(false);
    setMessage("Successfully signed in!");
    setIsSuccess(true);

    if (onAuthSuccess) {
      setTimeout(() => {
        onAuthSuccess();
      }, 500);
    }
  }, [onAuthSuccess]);

  // Listen for auth state changes
  useEffect(() => {
    if (!isMounted) return;

    let timeoutId: NodeJS.Timeout;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change in form:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("✅ User signed in successfully");
        handleAuthSuccess();
      } else if (event === "SIGNED_OUT") {
        console.log("ℹ️ User signed out");
        setIsGoogleLoading(false);
        setIsLoading(false);
        setMessage("");
        setIsSuccess(false);
      } else if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed");
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, handleAuthSuccess, isMounted]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setMessage(error.message);
          setIsSuccess(false);
        } else {
          setMessage(
            "Check your email to confirm your account before signing in!",
          );
          setIsSuccess(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setMessage(
              "Please check your email and confirm your account before signing in.",
            );
          } else {
            setMessage(error.message);
          }
          setIsSuccess(false);
        } else {
          setMessage("Successfully signed in!");
          setIsSuccess(true);
          console.log(
            "Authentication successful, calling onAuthSuccess callback",
          );

          // Small delay to ensure auth state is updated
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess();
            }
          }, 100);
        }
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isGoogleLoading || !isMounted) return; // Prevent double clicks and ensure mounted

    setIsGoogleLoading(true);
    setMessage("");
    setIsSuccess(false);

    try {
      console.log("🔄 Starting Google OAuth flow...");
      console.log("🌐 Current URL:", window.location.href);

      // Clear any existing session and storage to prevent conflicts
      console.log("🧹 Clearing existing auth state...");
      await supabase.auth.signOut({ scope: "local" });

      // Clear any stale auth storage
      if (typeof window !== "undefined") {
        const authKeys = Object.keys(localStorage).filter(
          (key) => key.includes("supabase") || key.includes("sb-"),
        );
        authKeys.forEach((key) => localStorage.removeItem(key));
      }

      // Extended delay to ensure cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get the current origin for redirect URL
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth/callback`;

      console.log("🔗 Redirect URL:", redirectUrl);
      console.log("🌐 Current origin:", origin);

      // Validate environment
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error("Missing Supabase configuration");
      }

      // Enhanced OAuth configuration
      const oauthOptions = {
        provider: "google" as const,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            include_granted_scopes: "true",
            response_type: "code",
          },
          skipBrowserRedirect: false,
        },
      };

      console.log("🔧 OAuth options:", oauthOptions);

      // Initiate OAuth with Google using enhanced configuration
      const { data, error } = await supabase.auth.signInWithOAuth(oauthOptions);

      if (error) {
        console.error("❌ OAuth initiation error:", error);

        // Provide more specific error messages
        let errorMessage = "Google sign-in failed";
        if (error.message.includes("Provider not found")) {
          errorMessage =
            "Google OAuth is not configured. Please contact support.";
        } else if (error.message.includes("Invalid redirect URL")) {
          errorMessage = "OAuth configuration error. Please contact support.";
        } else if (error.message.includes("not enabled")) {
          errorMessage = "Google OAuth is not enabled. Please contact support.";
        } else {
          errorMessage = `Google sign-in failed: ${error.message}`;
        }

        setMessage(errorMessage);
        setIsSuccess(false);
        setIsGoogleLoading(false);
        return;
      }

      console.log("✅ OAuth initiated successfully");
      console.log("📊 OAuth data:", data);

      // Enhanced timeout with better error handling
      const timeoutId = setTimeout(() => {
        if (isGoogleLoading) {
          console.log("⚠️ OAuth redirect timeout, resetting state");
          setIsGoogleLoading(false);
          setMessage(
            "OAuth redirect took too long. Please check if popups are blocked and try again.",
          );
          setIsSuccess(false);
        }
      }, 15000); // 15 second timeout

      // Store timeout ID for cleanup
      (window as any).oauthTimeoutId = timeoutId;

      // The browser will redirect to Google, so we don't set loading to false here
      // The loading state will be cleared by the auth state change listener or timeout
    } catch (error) {
      console.error("❌ Unexpected OAuth error:", error);
      setMessage(
        error instanceof Error
          ? `OAuth error: ${error.message}`
          : "Failed to connect to Google. Please try again.",
      );
      setIsSuccess(false);
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <p className="text-gray-600">
            {isSignUp
              ? "Sign up to start generating case studies"
              : "Sign in to generate case studies"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isGoogleLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {message && (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                <Mail className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isGoogleLoading || !email || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          {/* Google Sign In Button - Only render when mounted to prevent hydration issues */}
          {isMounted && (
            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              className="w-full mb-6"
              disabled={isLoading || isGoogleLoading || !isMounted}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Google...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          )}

          {/* Loading placeholder for Google button during hydration */}
          {!isMounted && (
            <Button variant="outline" className="w-full mb-6" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </Button>
          )}

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
                setPassword("");
              }}
              disabled={isLoading || isGoogleLoading}
              className="text-sm"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </Button>
          </div>

          {isSignUp && (
            <div className="mt-4 text-center text-xs text-gray-600">
              <p>You'll receive a confirmation email after signing up.</p>
              <p className="mt-1">
                Please confirm your email before signing in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading component for server-side rendering
function AuthFormLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Dynamic import wrapper to prevent hydration issues
import dynamic from "next/dynamic";

const AuthForm = dynamic(() => Promise.resolve(AuthFormClient), {
  ssr: false,
  loading: () => <AuthFormLoading />,
});

export default AuthForm;
