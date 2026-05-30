"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/language-context";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "guest_banner_dismissed";

export function GuestBanner() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // لا يظهر الشريط إلا للزوّار غير المسجّلين. المستخدم المسجّل لا يراه أبداً.
    let active = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const isGuest = !session;
      if (isGuest && !localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="sticky top-14 z-40 flex items-center justify-between gap-3 border-b bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
      <p className="text-sm">{t('guestBannerText')}</p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/signup"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          {t('guestBannerSignup')}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('guestBannerCloseAriaLabel')}
          className="rounded-full p-1 transition-colors hover:bg-white/10"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
