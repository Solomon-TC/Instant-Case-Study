import { TempoInit } from "@/components/tempo-init";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Force dynamic rendering to prevent stale cached server rendering
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Case Study Generator - Generate Case Studies with AI Instantly",
  description:
    "The best AI case study generator to create professional case studies in seconds. Generate case studies with AI for freelancers, agencies, and businesses. Try our AI case study tool free.",
  keywords: [
    "ai case study generator",
    "case study generator",
    "ai case study",
    "generate case studies with ai",
    "ai case study tool",
    "automated case study generator",
    "case study ai",
    "ai powered case study generator",
    "business case studies",
    "professional case studies",
    "freelancer tools",
    "agency tools",
  ],
  authors: [{ name: "Instant Case Study" }],
  creator: "Instant Case Study",
  publisher: "Instant Case Study",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://instantcasestudy.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Case Study Generator - Generate Case Studies with AI",
    description:
      "The best AI case study generator. Create professional case studies in seconds with our AI case study tool. Free to try.",
    url: "https://instantcasestudy.com",
    siteName: "Instant Case Study",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Instant Case Study",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Case Study Generator - Generate Case Studies with AI",
    description:
      "The best AI case study generator. Create professional case studies in seconds with our AI case study tool.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script src="https://api.tempo.new/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "AI Case Study Generator - Instant Case Study",
              alternateName: "AI Case Study Tool",
              url: "https://instantcasestudy.com",
              description:
                "The best AI case study generator to create professional case studies with AI in seconds. Generate case studies with AI for businesses, freelancers, and agencies.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              keywords:
                "ai case study generator, case study generator, ai case study, generate case studies with ai",
              offers: {
                "@type": "Offer",
                price: "9.99",
                priceCurrency: "USD",
                priceValidUntil: "2025-12-31",
                availability: "https://schema.org/InStock",
              },
              creator: {
                "@type": "Organization",
                name: "Instant Case Study",
              },
              featureList: [
                "AI-powered case study generation",
                "Professional templates",
                "Social media integration",
                "PDF export",
                "Unlimited generations (Pro)",
              ],
            }),
          }}
        />
        {children}
        <Toaster />
        <TempoInit />
        <Analytics />
      </body>
    </html>
  );
}
