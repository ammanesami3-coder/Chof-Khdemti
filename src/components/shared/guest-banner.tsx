"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const STORAGE_KEY = "guest_banner_dismissed";

export function GuestBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="sticky top-14 z-40 flex items-center justify-between gap-3 border-b bg-primary px-4 py-2.5 text-primary-foreground shadow-sm">
      <p className="text-sm">سجّل لتتفاعل ومتابعة الحرفيين</p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/signup"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          إنشاء حساب
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق البانر"
          className="rounded-full p-1 transition-colors hover:bg-white/10"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
