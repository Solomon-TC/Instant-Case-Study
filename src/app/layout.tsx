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
  title: "Instant Case Study – AI-Generated Client Wins",
  description:
    "Turn your project wins into professional case studies in seconds — just fill in your results and let AI do the writing. Turn bullet points into polished AI case studies. Automate client proof, win deals, and build your brand — no writing required.",
  keywords: [
    "case study generator",
    "AI case studies",
    "business case studies",
    "freelancer tools",
    "agency tools",
    "startup tools",
  ],
  authors: [{ name: "Instant Case Study" }],
  creator: "Instant Case Study",
  publisher: "Instant Case Study",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://www.instantcasestudy.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Instant Case Study – AI-Generated Client Wins",
    description:
      "Turn your project wins into professional case studies in seconds — just fill in your results and let AI do the writing. Turn bullet points into polished AI case studies. Automate client proof, win deals, and build your brand — no writing required.",
    url: "https://www.instantcasestudy.com",
    siteName: "Instant Case Study",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Instant Case Study - AI-Generated Client Wins",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Instant Case Study – AI-Generated Client Wins",
    description:
      "Turn your project wins into professional case studies in seconds — just fill in your results and let AI do the writing. Turn bullet points into polished AI case studies. Automate client proof, win deals, and build your brand — no writing required.",
    images: ["/og-image.jpg"],
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
              name: "Instant Case Study",
              url: "https://www.instantcasestudy.com",
              description:
                "Generate professional case studies instantly with AI. Perfect for freelancers, agencies, and startups.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
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
