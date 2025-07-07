"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { CaseStudy, User } from "@/lib/supabase";
import {
  FileDown,
  Copy,
  LogOut,
  Crown,
  AlertTriangle,
  User as UserIcon,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AuthForm from "@/components/auth-form";
import UpgradeModal from "@/components/upgrade-modal";
import { softDeleteUser } from "@/lib/soft-delete-user";

// Force dynamic rendering to prevent stale cached server rendering
export const dynamic = "force-dynamic";

interface FormData {
  clientType: string;
  challenge: string;
  solution: string;
  result: string;
  tone: string;
  industry: string;
  clientQuote: string;
}

const toneOptions = [
  "Professional",
  "Friendly",
  "Bold",
  "Casual",
  "Persuasive",
];

const industryOptions = [
  "SaaS",
  "Ecommerce",
  "Coaching",
  "Agency",
  "Local Business",
];

export default function AppPage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Using the persistent singleton supabase client
  const supabase = supabaseBrowser;
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    clientType: "",
    challenge: "",
    solution: "",
    result: "",
    tone: "",
    industry: "",
    clientQuote: "",
  });

  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<string>("");
  const [socialMediaText, setSocialMediaText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previousCaseStudies, setPreviousCaseStudies] = useState<CaseStudy[]>(
    [],
  );
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enhanced session hydration and user data loading
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("🔄 App page: Initializing session...");

        // Enhanced session retrieval with comprehensive retry logic
        let session = null;
        let sessionError = null;
        let attempts = 0;
        const maxAttempts = 5; // Increased attempts

        while (!session && attempts < maxAttempts) {
          console.log(
            `🔍 App session check attempt ${attempts + 1}/${maxAttempts}`,
          );

          const result = await supabase.auth.getSession();
          session = result.data.session;
          sessionError = result.error;

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
            throw new Error("Failed to get session after multiple attempts");
          }

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

        if (!session?.user) {
          console.log("ℹ️ No authenticated user found in app page");
          setUser(null);
          setUserProfile(null);
          setPreviousCaseStudies([]);
          setIsLoading(false);
          return;
        }

        // Set user
        console.log("✅ User session found in app page:", session.user.email);
        setUser(session.user);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .eq("is_deleted", false)
          .single();

        if (profileError) {
          // If user doesn't exist in users table, create one
          if (profileError.code === "PGRST116") {
            const newUserData = {
              id: session.user.id,
              email: session.user.email || "",
              is_pro: false,
              generation_count: 0,
              is_deleted: false,
            };

            const { data: newUser, error: createError } = await supabase
              .from("users")
              .insert(newUserData)
              .select()
              .single();

            if (createError) {
              console.error("Error creating user profile:", createError);
              throw new Error("Failed to create user profile");
            }

            if (newUser) {
              setUserProfile(newUser as User);
            }
          } else {
            console.error("Profile fetch error:", profileError);
            throw new Error("Failed to fetch user profile");
          }
        } else if (profile) {
          setUserProfile(profile as User);
        }

        // Fetch case studies
        const { data: studies, error: studiesError } = await supabase
          .from("case_studies")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (studiesError) {
          console.error("Case studies fetch error:", studiesError);
          // Don't throw here, just log and continue with empty array
          setPreviousCaseStudies([]);
        } else {
          setPreviousCaseStudies(studies || []);
        }

        setIsLoadingPrevious(false);
      } catch (error) {
        console.error("Error in session initialization:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load data",
        );
        toast({
          title: "Error",
          description: "Failed to load your data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setUserProfile(null);
        setPreviousCaseStudies([]);
        setGeneratedCaseStudy("");
        setSocialMediaText("");
        setError(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" && session?.user) {
        // Re-run initialization for sign in
        init();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching user profile for ID:", userId);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .eq("is_deleted", false)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        // If user doesn't exist in users table, create one
        if (error.code === "PGRST116") {
          console.log("User profile not found, creating new profile...");
          const { data: authUser } = await supabase.auth.getUser();
          const newUserData = {
            id: userId,
            email: authUser.user?.email || "",
            is_pro: false,
            generation_count: 0,
            is_deleted: false,
          };

          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert(newUserData)
            .select()
            .single();

          if (createError) {
            console.error("Error creating user profile:", createError);
            return;
          }

          console.log("New user profile created:", newUser);
          if (newUser) {
            setUserProfile(newUser as User);
          }
        }
        return;
      }

      console.log("User profile fetched successfully:", data);
      if (data) {
        setUserProfile(data as User);
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      // Soft delete the user
      await softDeleteUser(user.id);

      // Show success message
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });

      // Sign out the user
      await supabase.auth.signOut({ scope: "global" });

      // Redirect to landing page
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Show loading state
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out.",
      });

      // Clear local state first to prevent UI flickering
      setUser(null);
      setUserProfile(null);
      setPreviousCaseStudies([]);
      setGeneratedCaseStudy("");
      setSocialMediaText("");

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: "global",
      });

      if (error) {
        console.error("Supabase sign out error:", error);
        // Even if Supabase returns an error, we still want to clear the session locally
        // This handles cases where the session might be invalid but still stored
      }

      // Clear any remaining auth cookies manually
      if (typeof document !== "undefined") {
        const authCookies = [
          "sb-access-token",
          "sb-refresh-token",
          "supabase-auth-token",
        ];
        authCookies.forEach((cookieName) => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });
      }

      // Clear localStorage items that might contain auth data
      if (typeof localStorage !== "undefined") {
        const authKeys = Object.keys(localStorage).filter(
          (key) => key.includes("supabase") || key.includes("auth"),
        );
        authKeys.forEach((key) => localStorage.removeItem(key));
      }

      // Success toast
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });

      // Force page reload to ensure completely clean state
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("Unexpected error during sign out:", error);

      // Even on error, clear local state and redirect
      setUser(null);
      setUserProfile(null);
      setPreviousCaseStudies([]);
      setGeneratedCaseStudy("");
      setSocialMediaText("");

      toast({
        title: "Sign out completed",
        description:
          "You have been signed out. If you experience any issues, please clear your browser cache.",
        variant: "destructive",
      });

      // Still redirect even on error to ensure user is logged out
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchPreviousCaseStudies = async () => {
    if (!user) {
      setIsLoadingPrevious(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("case_studies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching case studies:", error);
        return;
      }

      setPreviousCaseStudies(data || []);
    } catch (error) {
      console.error("Error fetching case studies:", error);
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  const generateCaseStudy = async () => {
    // Ensure user is authenticated and profile is loaded
    if (!user || !userProfile) {
      toast({
        title: "Error",
        description: "Please sign in to generate case studies.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has reached limit
    if (!userProfile.is_pro && (userProfile.generation_count ?? 0) >= 3) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-case-study", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(errorData.error || "Failed to generate case study");
      }

      const data = await response.json();
      setGeneratedCaseStudy(data.caseStudy);
      setSocialMediaText(data.socialMediaText || "");

      // Refresh user profile and case studies only if user is still authenticated
      if (data.saved && user) {
        await fetchUserProfile(user.id);
        await fetchPreviousCaseStudies();
      }

      toast({
        title: "Success!",
        description: "Your case study has been generated.",
      });
    } catch (error) {
      console.error("Error generating case study:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate case study. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateCaseStudy();
  };

  const isFormValid =
    formData.clientType &&
    formData.challenge &&
    formData.solution &&
    formData.result &&
    formData.tone &&
    formData.industry;

  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    // Set up the document
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addWrappedText = (
      text: string,
      fontSize: number,
      isBold: boolean = false,
    ) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }

      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * (fontSize * 0.4) + 10;
    };

    // Extract headline from generated case study
    const lines = generatedCaseStudy.split("\n");
    const headline = lines[0] || "Case Study";
    const content = lines.slice(1).join("\n");

    // Add headline
    addWrappedText(headline, 18, true);
    yPosition += 10;

    // Add main content
    addWrappedText(content, 12);

    // Add client quote if provided
    if (formData.clientQuote) {
      yPosition += 10;
      addWrappedText(`"${formData.clientQuote}"`, 12, true);
    }

    // Add footer
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Generated by Instant Case Study", margin, yPosition);

    // Save the PDF
    // Use nullish coalescing to provide default value if clientType is undefined
    const fileName = `case-study-${(formData.clientType ?? "client").replace(/\s+/g, "-").toLowerCase()}.pdf`;
    doc.save(fileName);
  };

  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const copyToClipboard = async () => {
    try {
      // Replace placeholder URL with actual URL
      const finalText = socialMediaText.replace(
        "https://your-app-url.com",
        window.location.origin,
      );
      await navigator.clipboard.writeText(finalText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const openSocialLink = (platform: string) => {
    const baseUrl = window.location.origin;
    const urls = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(baseUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(baseUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(baseUrl)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(baseUrl)}`,
    };

    window.open(urls[platform as keyof typeof urls], "_blank");
  };

  // Show loading state while session is being loaded
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Show error state if there was an error loading data
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  // Show auth form if not logged in (only after loading is complete)
  if (!user) {
    return (
      <AuthForm
        onAuthSuccess={() => {
          // Auth state change will be handled by the useEffect listener
        }}
      />
    );
  }

  // Show loading if user profile is not yet loaded
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const remainingGenerations = userProfile.is_pro
    ? "Unlimited"
    : Math.max(0, 3 - (userProfile.generation_count ?? 0));
  const showLimitWarning =
    !userProfile.is_pro && (userProfile.generation_count ?? 0) >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pt-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative mb-8">
          {/* User Dropdown - Positioned absolutely in top right */}
          <div className="absolute -top-4 right-0 flex items-center gap-3">
            {userProfile?.is_pro && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                <Crown className="h-4 w-4" />
                Pro
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-gray-600">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-xs text-gray-500">
                    Generations: {remainingGenerations}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Centered Title and Tagline */}
          <div className="text-center pt-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Instant Case Study
            </h1>
            <p className="text-lg text-gray-600">
              Transform your project wins into compelling case studies in
              minutes
            </p>
          </div>
        </div>

        {/* Generation Limit Warning */}
        {showLimitWarning && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You have {remainingGenerations} generation
              {remainingGenerations !== 1 ? "s" : ""} remaining.
              <Button
                variant="link"
                className="p-0 h-auto text-orange-800 underline"
                onClick={() => setShowUpgradeModal(true)}
              >
                Upgrade to Pro
              </Button>{" "}
              for unlimited access.
            </AlertDescription>
          </Alert>
        )}
        {/* Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="clientType">Client Type</Label>
                  <Input
                    id="clientType"
                    placeholder="e.g., Tech Startup, Local Restaurant, E-commerce Brand"
                    value={formData.clientType}
                    onChange={(e) =>
                      handleInputChange("clientType", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    value={formData.tone}
                    onValueChange={(value) => handleInputChange("tone", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((tone) => (
                        <SelectItem key={tone} value={tone}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) =>
                    handleInputChange("industry", value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenge">Challenge</Label>
                <Textarea
                  id="challenge"
                  placeholder="Describe the main challenge or problem your client was facing..."
                  value={formData.challenge}
                  onChange={(e) =>
                    handleInputChange("challenge", e.target.value)
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="solution">Solution</Label>
                <Textarea
                  id="solution"
                  placeholder="Explain the solution you provided and how you implemented it..."
                  value={formData.solution}
                  onChange={(e) =>
                    handleInputChange("solution", e.target.value)
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="result">Result</Label>
                <Textarea
                  id="result"
                  placeholder="Share the specific results, metrics, and outcomes achieved..."
                  value={formData.result}
                  onChange={(e) => handleInputChange("result", e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientQuote">Client Quote (Optional)</Label>
                <Textarea
                  id="clientQuote"
                  placeholder="Include a testimonial or quote from your client..."
                  value={formData.clientQuote}
                  onChange={(e) =>
                    handleInputChange("clientQuote", e.target.value)
                  }
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  !isFormValid ||
                  isGenerating ||
                  (!userProfile.is_pro &&
                    (userProfile.generation_count ?? 0) >= 3)
                }
              >
                {isGenerating
                  ? "Generating Your Case Study..."
                  : !userProfile.is_pro &&
                      (userProfile.generation_count ?? 0) >= 3
                    ? "Upgrade to Generate More"
                    : "Generate My Case Study"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Generated Case Study */}
        {generatedCaseStudy && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Generated Case Study</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-line text-gray-800 leading-relaxed mb-6">
                  {generatedCaseStudy}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-6 pt-6 border-t">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={exportToPDF}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Export as PDF
                  </Button>
                </div>

                {/* Share on Socials Section */}
                {socialMediaText && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Share on Socials
                    </h3>

                    <div className="space-y-3">
                      <Textarea
                        value={socialMediaText.replace(
                          "https://your-app-url.com",
                          window.location.origin,
                        )}
                        readOnly
                        rows={4}
                        className="resize-none bg-gray-50"
                        placeholder="Your social media post will appear here..."
                      />

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={copyToClipboard}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          {copySuccess ? "Copied!" : "📋 Copy to Clipboard"}
                        </Button>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => openSocialLink("linkedin")}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </Button>

                          <Button
                            onClick={() => openSocialLink("twitter")}
                            size="sm"
                            className="bg-black hover:bg-gray-800 text-white px-3"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </Button>

                          <Button
                            onClick={() => openSocialLink("facebook")}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </Button>

                          <Button
                            onClick={() => openSocialLink("reddit")}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3"
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.25-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                            </svg>
                          </Button>
                        </div>
                      </div>

                      {copySuccess && (
                        <p className="text-sm text-green-600 font-medium">
                          Post text copied to clipboard. Paste it when prompted.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Case Studies */}
        <Card>
          <CardHeader>
            <CardTitle>Previous Case Studies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPrevious ? (
              <div className="text-center py-8 text-gray-500">
                Loading previous case studies...
              </div>
            ) : previousCaseStudies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No case studies yet. Generate your first one above!
              </div>
            ) : (
              <div className="space-y-4">
                {previousCaseStudies.map((caseStudy) => {
                  const headline =
                    caseStudy.ai_output.split("\n")[0] || "Case Study";
                  const resultSnippet =
                    caseStudy.result.length > 100
                      ? caseStudy.result.substring(0, 100) + "..."
                      : caseStudy.result;
                  const date = caseStudy.created_at
                    ? new Date(caseStudy.created_at).toLocaleDateString()
                    : "Unknown";

                  return (
                    <div
                      key={caseStudy.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="font-semibold text-lg mb-2 text-gray-900">
                        {headline}
                      </h3>
                      <p className="text-gray-600 mb-2">{resultSnippet}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>
                          {caseStudy.client_type} • {caseStudy.industry}
                        </span>
                        <span>{date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user?.email || ""}
        userId={user?.id}
      />
    </div>
  );
}
