import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instant Case Study – AI-Generated Client Wins",
  description:
    "Instantly turn your client work into polished case studies with the help of AI. Impress clients, win deals, and build your brand — no writing required.",
  keywords: [
    "case study generator",
    "AI case studies",
    "client wins",
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
    title: "Instant Case Study – AI-Generated Client Wins",
    description:
      "Instantly turn your client work into polished case studies with the help of AI. Impress clients, win deals, and build your brand — no writing required.",
    url: "https://instantcasestudy.com",
    siteName: "Instant Case Study",
    images: [
      {
        url: "/og-image.png",
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
      "Instantly turn your client work into polished case studies with the help of AI. Impress clients, win deals, and build your brand — no writing required.",
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
