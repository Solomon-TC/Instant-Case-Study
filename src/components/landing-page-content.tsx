"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Image from "next/image";

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
            Generate case studies with AI in seconds. The best AI case study
            tool to create professional case studies that impress clients and
            win more deals.
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

          {/* Features Preview - Moved above transformation showcase */}
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
                AI Case Study Generation
              </h3>
              <p className="text-gray-600">
                Our AI case study generator transforms your project details into
                compelling, professional case studies automatically.
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
                Generate professional case studies in minutes, not hours.
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
                Impress clients and win deals with polished, persuasive case
                studies.
              </p>
            </div>
          </div>

          {/* Transformation Showcase - Improved layout */}
          <div className="pt-20 pb-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How Our AI Case Study Generator Works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Simply fill out your project details and watch our AI case study
                tool transform them into a professional case study instantly.
              </p>
            </div>

            <div className="max-w-7xl mx-auto">
              {/* Desktop: Side by side layout */}
              <div className="hidden lg:grid lg:grid-cols-5 gap-8 items-center">
                {/* Input Form */}
                <div className="col-span-2 space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Fill in your details
                    </h3>
                    <p className="text-gray-600">
                      Enter your project information
                    </p>
                  </div>
                  <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
                    <Image
                      src="/case-study-input.png"
                      alt="Case study input form showing project details fields"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-lg">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Generated Output */}
                <div className="col-span-2 space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Get your case study
                    </h3>
                    <p className="text-gray-600">
                      AI creates a professional result
                    </p>
                  </div>
                  <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
                    <Image
                      src="/case-study-output.png"
                      alt="Generated case study showing professional formatted content"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Mobile: Stacked layout */}
              <div className="lg:hidden space-y-8">
                {/* Input Form */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      1. Fill in your details
                    </h3>
                    <p className="text-gray-600">
                      Enter your project information
                    </p>
                  </div>
                  <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
                    <Image
                      src="/case-study-input.png"
                      alt="Case study input form showing project details fields"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full shadow-lg">
                    <svg
                      className="w-8 h-8 text-white transform rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Generated Output */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      2. Get your case study
                    </h3>
                    <p className="text-gray-600">
                      AI creates a professional result
                    </p>
                  </div>
                  <div className="relative rounded-lg overflow-hidden shadow-xl border border-gray-200">
                    <Image
                      src="/case-study-output.png"
                      alt="Generated case study showing professional formatted content"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Indicator */}
            <div className="text-center mt-12">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium">
                <svg
                  className="w-5 h-5"
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
                Generated in under 30 seconds
              </div>
            </div>
          </div>

          {/* Who We Help Section */}
          <div className="pt-20 pb-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Who Uses Our AI Case Study Generator
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Whether you're just starting out or scaling up, our AI case
                study generator helps you showcase your wins and attract more
                clients with professional case studies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Freelancers
                </h3>
                <p className="text-gray-600 text-sm">
                  Build credibility and win more clients by showcasing your
                  successful projects with AI-generated case studies.
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Small Businesses
                </h3>
                <p className="text-gray-600 text-sm">
                  Demonstrate your value to customers and stand out from
                  competitors with compelling success stories.
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Agencies
                </h3>
                <p className="text-gray-600 text-sm">
                  Streamline your client reporting and create impressive AI case
                  studies that help you retain and attract clients.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-8 h-8 text-orange-600"
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Startups
                </h3>
                <p className="text-gray-600 text-sm">
                  Build trust with investors and customers by documenting your
                  early wins and growth milestones.
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="pt-16 pb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                AI Case Study Generator Features
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From free AI case study generation to professional exports,
                we've got all the features you need to create and share
                compelling case studies with AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  3 Free AI Case Studies
                </h3>
                <p className="text-gray-600">
                  Try our AI case study generator with 3 free case study
                  generations. No credit card required to start generating case
                  studies with AI.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Export AI Case Studies to PDF
                </h3>
                <p className="text-gray-600">
                  Download your AI-generated case studies as professional PDF
                  documents, perfect for client presentations and proposals.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Share AI Case Studies
                </h3>
                <p className="text-gray-600">
                  Get AI-generated social media posts for LinkedIn, Twitter, and
                  more to amplify your AI case studies.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12h6m-6 4h6"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Professional Templates
                </h3>
                <p className="text-gray-600">
                  Choose from multiple tones and industry-specific templates to
                  match your brand and audience.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-yellow-600"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Lightning Fast AI Generation
                </h3>
                <p className="text-gray-600">
                  Generate professional case studies with AI in under 30
                  seconds. No more spending hours on writing and formatting.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Secure & Private
                </h3>
                <p className="text-gray-600">
                  Your data is encrypted and secure. We never share your case
                  studies or client information with anyone.
                </p>
              </div>
            </div>

            {/* Final CTA */}
            <div className="text-center mt-16">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="text-lg px-8 py-4 h-auto font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Generate Case Studies with AI →
              </Button>
              <p className="text-sm text-gray-500 mt-3">
                No credit card required • 3 free AI case study generations
              </p>
            </div>
          </div>

          {/* Customer Testimonials Section */}
          <div className="pt-20 pb-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                AI Case Study Generator Reviews
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join other professionals who are already generating compelling
                case studies with our AI case study generator.
              </p>
            </div>

            {/* Testimonial Placeholder */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12">
                <div className="text-center space-y-6">
                  {/* Quote Icon */}
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  {/* Placeholder Content */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold text-gray-900">
                      Testimonials Coming Soon
                    </h3>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                      We're collecting feedback from our amazing users. Check
                      back soon to see what professionals are saying about how
                      our AI case study generator has transformed their client
                      presentations and business growth.
                    </p>
                  </div>

                  {/* Placeholder Stars */}
                  <div className="flex justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-6 h-6 text-gray-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>

                  {/* Coming Soon Badge */}
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                    <svg
                      className="w-4 h-4"
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
                    Customer stories coming soon
                  </div>
                </div>
              </div>

              {/* Placeholder Carousel Dots */}
              <div className="flex justify-center space-x-2 mt-8">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
