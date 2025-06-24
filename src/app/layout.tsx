import { TempoInit } from "@/components/tempo-init";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Force dynamic rendering to prevent stale cached server rendering
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Instant Case Study | AI-Powered Case Study Generator",
  description:
    "Generate professional case studies instantly with AI. Perfect for freelancers, agencies, and startups. Transform your project wins into compelling case studies in minutes.",
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
  metadataBase: new URL("https://instantcasestudy.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Instant Case Study | AI-Powered Case Study Generator",
    description:
      "Generate professional case studies instantly with AI. Perfect for freelancers, agencies, and startups.",
    url: "https://instantcasestudy.com",
    siteName: "Instant Case Study",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Instant Case Study - AI-Powered Case Study Generator",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Instant Case Study | AI-Powered Case Study Generator",
    description:
      "Generate professional case studies instantly with AI. Perfect for freelancers, agencies, and startups.",
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
              url: "https://instantcasestudy.com",
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
      </body>
    </html>
  );
}
