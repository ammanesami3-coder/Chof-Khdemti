"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { useLang } from "@/lib/i18n/language-context";
import { getLegalDoc, type LegalDocId } from "@/lib/legal/legal-content";

type Props = {
  doc: LegalDocId;
};

/**
 * Renders a static legal document (terms / privacy) in the user's current
 * language. Public — usable by guests. Content lives in lib/legal/legal-content.
 */
export function LegalDocument({ doc }: Props) {
  const { lang, dir, t } = useLang();
  const content = getLegalDoc(doc, lang);
  // Home is "back" toward the start of the reading direction.
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <AppLogo size="sm" showText href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <BackIcon className="size-4" />
            {t("legalBackToHome")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("legalLastUpdated")}: {content.lastUpdated}
        </p>

        <p className="mt-6 leading-relaxed text-foreground/90">{content.intro}</p>

        <div className="mt-8 space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {section.heading}
              </h2>
              <div className="mt-2 space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/terms" className="hover:text-foreground hover:underline">
              {t("termsOfUseLink")}
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {t("privacyPolicyLink")}
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
