import { LandingPageContent } from "@/components/landing-page-content";
import type { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = {
  title:
    "Instant Case Study - Turn Project Wins into Professional Case Studies",
  description:
    "Generate professional case studies in seconds with AI. Transform your project results into compelling, polished case studies that impress clients and win more deals.",
  keywords:
    "case study generator, AI writing, project documentation, client presentation, professional case studies",
  openGraph: {
    title: "Instant Case Study - AI-Powered Case Study Generator",
    description:
      "Turn your project wins into professional case studies in seconds — just fill in your results and let AI do the writing.",
    type: "website",
  },
};

export default function LandingPage() {
  return <LandingPageContent />;
}
