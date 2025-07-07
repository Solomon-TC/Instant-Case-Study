import { LandingPageContent } from "@/components/landing-page-content";
import type { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = {
  title: "AI Case Study Generator - Create Professional Case Studies with AI",
  description:
    "The #1 AI case study generator. Generate case studies with AI in seconds. Transform your project wins into professional case studies that impress clients. Try our AI case study tool free.",
  keywords:
    "ai case study generator, case study generator, ai case study, generate case studies with ai, ai case study tool, automated case study generator, case study ai, professional case studies",
  openGraph: {
    title: "AI Case Study Generator - Generate Case Studies with AI",
    description:
      "The best AI case study generator to create professional case studies in seconds. Generate case studies with AI for free.",
    type: "website",
  },
};

export default function LandingPage() {
  return <LandingPageContent />;
}
