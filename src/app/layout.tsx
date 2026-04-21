import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "M3alem — منصة الحرفيين",
  description: "منصة اجتماعية للحرفيين وأصحاب الخدمات في المغرب والعالم العربي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className="font-[family-name:var(--font-cairo)] antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
