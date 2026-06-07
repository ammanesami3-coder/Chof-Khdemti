import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
} from "@/lib/constants/site";
import "./globals.css";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — منصة الحرفيين المغاربة`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  // The app switches UI language client-side (no locale sub-paths), so every
  // hreflang points at the canonical root. x-default falls back to Arabic.
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      fr: "/",
      en: "/",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${SITE_NAME} — منصة الحرفيين المغاربة`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    locale: "ar_MA",
    alternateLocale: ["fr_MA", "en_US"],
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — منصة الحرفيين المغاربة`,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.svg" />
      </head>
      <body className="font-[family-name:var(--font-cairo)] antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
        {adsenseClient && (
          <Script
            id="adsbygoogle-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
