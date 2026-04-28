"use client";

import { usePathname, useRouter } from "next/navigation";

type Action = "like" | "comment" | "follow" | "message" | "rate";

interface AuthGateProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  action?: Action;
  /** مسار الإعادة بعد الدخول — افتراضياً الصفحة الحالية */
  redirectTo?: string;
}

/**
 * يلفّ أي زر تفاعلي: إذا كان الزائر غير مسجّل يعترض النقر (capture phase)
 * ويحوّله لصفحة الدخول مع حفظ المسار الحالي في ?next
 */
export function AuthGate({
  children,
  isAuthenticated,
  action,
  redirectTo,
}: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (isAuthenticated) return <>{children}</>;

  function intercept(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const dest = redirectTo ?? pathname;
    const params = new URLSearchParams({ next: dest });
    if (action) params.set("action", action);
    router.push(`/login?${params.toString()}`);
  }

  return (
    <span onClickCapture={intercept} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
