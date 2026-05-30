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

/**
 * Creates a redirect that carries any auth cookies set by Supabase SSR.
 * Without this, a token rotation that happens during updateSession() is lost
 * when we return a NextResponse.redirect() instead of supabaseResponse —
 * the browser keeps the old (now-invalidated) refresh token, causing
 * "Invalid Refresh Token: Already Used" errors on the next request.
 */
function redirectWithAuth(url: URL, supabaseResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
    redirect.cookies.set(name, value, rest as Parameters<typeof redirect.cookies.set>[2]);
  });
  return redirect;
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
      .some((c) => c.name.startsWith("sb-") && c.value.length > 0);
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return redirectWithAuth(loginUrl, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (user) {
    // مسجّل ويحاول فتح صفحة auth → تحقق من onboarding
    if (isAuthPage) {
      const done = await getOnboardingComplete(supabase, user.id);
      return redirectWithAuth(new URL(done ? "/" : "/onboarding", request.url), supabaseResponse);
    }

    // مسجّل وعلى مسار محمي → تحقق من onboarding
    // تحسين الأداء: نتيجة "أكمل التسجيل" تُخزَّن في كوكي مرتبط بالـ user.id،
    // فلا نستعلم قاعدة البيانات في كل تنقّل — فقط أول مرة لكل مستخدم.
    if (isProtected && !isOnboarding && !isLogout) {
      const obCookie = request.cookies.get("ob_done")?.value;
      if (obCookie !== user.id) {
        const done = await getOnboardingComplete(supabase, user.id);
        if (!done) {
          return redirectWithAuth(new URL("/onboarding", request.url), supabaseResponse);
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
