import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// مسارات تتطلب تسجيل الدخول — / و /explore و /profile/[username] عامة متعمداً
const PROTECTED_PATHS = ["/messages", "/settings", "/profile/me", "/onboarding", "/notifications"];
const AUTH_PATHS = ["/login", "/signup"];

async function getOnboardingComplete(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("user_id", userId)
    .single();
  return data?.onboarding_complete ?? false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isLogout = pathname.startsWith("/logout");

  // مستخدم غير مسجّل على مسار محمي → /login
  // لكن: إذا كان getUser() فشل لحظياً (user=null) مع وجود كوكيز جلسة، لا نطرده —
  // نمرّر الطلب وتتكفّل صفحة السيرفر/RLS بالتحقق الحقيقي. هذا يمنع التوجيه
  // الخاطئ إلى /login عند أخطاء التحديث اللحظية.
  if (isProtected && !user) {
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-"));
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (user) {
    // مسجّل ويحاول فتح صفحة auth → تحقق من onboarding
    if (isAuthPage) {
      const done = await getOnboardingComplete(supabase, user.id);
      return NextResponse.redirect(new URL(done ? "/" : "/onboarding", request.url));
    }

    // مسجّل وعلى مسار محمي → تحقق من onboarding
    // تحسين الأداء: نتيجة "أكمل التسجيل" تُخزَّن في كوكي مرتبط بالـ user.id،
    // فلا نستعلم قاعدة البيانات في كل تنقّل — فقط أول مرة لكل مستخدم.
    if (isProtected && !isOnboarding && !isLogout) {
      const obCookie = request.cookies.get("ob_done")?.value;
      if (obCookie !== user.id) {
        const done = await getOnboardingComplete(supabase, user.id);
        if (!done) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
        supabaseResponse.cookies.set("ob_done", user.id, {
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
          sameSite: "lax",
        });
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
