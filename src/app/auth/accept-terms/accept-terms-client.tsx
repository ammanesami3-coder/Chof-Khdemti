"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { acceptTerms } from "@/lib/actions/terms";
import { useLang } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/layout/app-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AcceptTermsClientProps {
  /** Where to send the user after they accept (validated server-side). */
  next?: string;
}

export function AcceptTermsClient({ next }: AcceptTermsClientProps) {
  const router = useRouter();
  const { t, dir } = useLang();
  const [loading, setLoading] = useState(false);

  async function onAgree() {
    setLoading(true);
    const result = await acceptTerms();
    setLoading(false);

    if (result.error) {
      toast.error(t("termsGateError"));
      return;
    }

    // Hard-ish navigation + refresh so the middleware re-reads the new
    // acceptance state (and clears the gate) on the next render.
    router.push(next ?? "/feed");
    router.refresh();
  }

  return (
    <div
      dir={dir}
      className="flex min-h-screen items-center justify-center bg-background px-4 py-10"
    >
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex justify-center">
            <AppLogo size="lg" href={undefined} />
          </div>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="mt-3 text-xl">{t("termsGateTitle")}</CardTitle>
          <CardDescription className="leading-relaxed">
            {t("termsGatePrompt")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {t("termsGateReadPrefix")}{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              {t("termsOfUseLink")}
            </Link>{" "}
            {/* Arabic wāw attaches to the next word; FR/EN carry their own spacing */}
            {t("andConnector")}
            <Link
              href="/privacy"
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              {t("privacyPolicyLink")}
            </Link>
            .
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="brand"
            className="w-full"
            onClick={onAgree}
            disabled={loading}
          >
            {loading && <Loader2 className="ms-2 size-4 animate-spin" />}
            {t("termsGateAgreeBtn")}
          </Button>

          {/* Decline → log out cleanly and browse as a guest.
              Plain <a> + buttonVariants since this Button (Base UI) has no asChild. */}
          <a
            href="/logout"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full text-muted-foreground",
            )}
          >
            {t("termsGateLogout")}
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
