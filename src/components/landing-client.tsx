"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";

export function LandingClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Initialize Supabase client for session detection
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          // Continue to show landing page on session error
          setIsCheckingAuth(false);
          setIsLoading(false);
          return;
        }

        // If user is authenticated, redirect to /app
        if (session?.user) {
          console.log("User is authenticated, redirecting to /app");
          router.push("/app");
          return;
        }

        // User is not authenticated, show landing page
        setIsCheckingAuth(false);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking authentication:", error);
        // Show landing page on error
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        console.log("User signed in, redirecting to /app");
        router.push("/app");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleGetStarted = () => {
    router.push("/app");
  };

  // Show loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
            Instant Case Study
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Turn your project wins into professional case studies in seconds —
            just fill in your results and let AI do the writing.
          </p>

          {/* CTA Button */}
          <div className="pt-8">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-lg px-8 py-4 h-auto font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Get Started →
            </Button>
          </div>

          {/* Features Preview */}
          <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                AI-Powered Writing
              </h3>
              <p className="text-gray-600">
                Let AI transform your project details into compelling,
                professional case studies.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Save Hours of Work
              </h3>
              <p className="text-gray-600">
                Generate professional case studies in minutes, not hours or
                days.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Professional Results
              </h3>
              <p className="text-gray-600">
                Impress clients and win more deals with polished, persuasive
                case studies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
