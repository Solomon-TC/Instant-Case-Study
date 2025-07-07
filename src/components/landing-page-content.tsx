"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function LandingPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = supabaseBrowser;

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        setIsCheckingAuth(true);
        console.log("🔄 Landing page: Checking authentication status...");

        // Wait longer for any ongoing auth processes
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Enhanced session checking with comprehensive retry logic
        let session = null;
        let attempts = 0;
        const maxAttempts = 5; // Increased attempts

        while (!session && attempts < maxAttempts) {
          console.log(
            `🔍 Session check attempt ${attempts + 1}/${maxAttempts}`,
          );

          const {
            data: { session: currentSession },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error(
              `Session error (attempt ${attempts + 1}):`,
              sessionError,
            );
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1500)); // Longer delay
              continue;
            }
            // Show landing page on persistent session error
            break;
          }

          session = currentSession;
          if (!session && attempts < maxAttempts - 1) {
            attempts++;
            console.log(
              `⏳ No session found, waiting before retry ${attempts + 1}/${maxAttempts}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1500)); // Longer delay
          } else {
            break;
          }
        }

        // If user is authenticated, redirect to /app
        if (session?.user) {
          console.log("✅ User is authenticated, redirecting to /app");
          console.log("👤 User:", session.user.email);

          // Enhanced user profile verification with retry logic
          let profileCreated = false;
          let profileAttempts = 0;
          const maxProfileAttempts = 3;

          while (!profileCreated && profileAttempts < maxProfileAttempts) {
            try {
              const { data: userProfile, error: profileError } = await supabase
                .from("users")
                .select("id, email, is_deleted")
                .eq("id", session.user.id)
                .eq("is_deleted", false)
                .single();

              if (profileError && profileError.code === "PGRST116") {
                // Create user profile if it doesn't exist
                console.log(
                  `📝 Creating user profile (attempt ${profileAttempts + 1})...`,
                );
                const { error: createError } = await supabase
                  .from("users")
                  .insert({
                    id: session.user.id,
                    email: session.user.email || "",
                    is_pro: false,
                    generation_count: 0,
                    is_deleted: false,
                  });

                if (createError) {
                  console.error("Profile creation error:", createError);
                  profileAttempts++;
                  if (profileAttempts < maxProfileAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                  }
                } else {
                  console.log("✅ User profile created successfully");
                  profileCreated = true;
                }
              } else if (!profileError) {
                console.log("✅ User profile already exists");
                profileCreated = true;
              } else {
                console.error("Profile fetch error:", profileError);
                profileAttempts++;
                if (profileAttempts < maxProfileAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
              }
              break;
            } catch (profileError) {
              console.error("Profile operation error:", profileError);
              profileAttempts++;
              if (profileAttempts < maxProfileAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
              }
              break;
            }
          }

          // Always redirect even if profile operations fail
          console.log("🔄 Redirecting to /app...");

          // Add a small delay before redirect to ensure everything is settled
          setTimeout(() => {
            window.location.href = "/app";
          }, 500);
          return;
        }

        console.log("ℹ️ No authenticated user found, showing landing page");
        setIsCheckingAuth(false);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "🔄 Landing page auth state change:",
        event,
        session?.user?.email,
      );

      if (event === "SIGNED_IN" && session?.user) {
        console.log(
          "✅ User signed in via auth state change, redirecting to /app",
        );
        // Small delay to ensure state is fully updated
        setTimeout(() => {
          window.location.href = "/app";
        }, 300);
      } else if (event === "SIGNED_OUT") {
        console.log("ℹ️ User signed out, staying on landing page");
        setIsCheckingAuth(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleGetStarted = () => {
    console.log("🔄 Get Started clicked, navigating to /app");
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
