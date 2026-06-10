import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
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
    // Image comes from the generated app/opengraph-image.tsx (1200×630 card).
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — منصة الحرفيين المغاربة`,
    description: SITE_DESCRIPTION,
    // Twitter image falls back to the generated opengraph-image.tsx.
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
        <NextTopLoader
          color="#DC2626"
          initialPosition={0.1}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #DC2626,0 0 5px #DC2626"
          zIndex={1600}
        />
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
        <Analytics />
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
