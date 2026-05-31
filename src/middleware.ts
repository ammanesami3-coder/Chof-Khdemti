import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// مسارات تتطلب تسجيل الدخول — / و /explore و /profile/[username] عامة متعمداً
const PROTECTED_PATHS = [
  "/messages",
  "/settings",
  "/profile/me",
  "/onboarding",
  "/notifications",
  "/auth/accept-terms",
];
const AUTH_PATHS = ["/login", "/signup"];

// مسارات لا تخضع لبوابة (onboarding / terms) للمستخدم المسجّل — حتى لا يحدث
// توجيه دائري، ويستطيع قراءة الشروط أو الخروج وهو على البوابة.
const GATE_ALLOWED_PREFIXES = [
  "/onboarding",
  "/auth/accept-terms",
  "/logout",
  "/terms",
  "/privacy",
];

type GateState = { onboardingComplete: boolean; termsAccepted: boolean };

/**
 * Single profiles lookup feeding both gates (onboarding + terms). Combined so a
 * gated navigation costs at most one query — and that query is skipped entirely
 * once the `gate_ok` cookie is set (see below).
 */
async function getGateState(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string
): Promise<GateState> {
  // terms_accepted_at is not in the generated types yet — cast to bypass.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("onboarding_complete, terms_accepted_at")
    .eq("user_id", userId)
    .single();

  // Pre-migration safety: if terms_accepted_at doesn't exist yet, the combined
  // select errors. Fall back to onboarding alone and treat terms as accepted so
  // users are never locked out before migration 0050 is applied.
  if (error) {
    const { data: ob } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("user_id", userId)
      .single();
    return { onboardingComplete: ob?.onboarding_complete ?? false, termsAccepted: true };
  }

  return {
    onboardingComplete: data?.onboarding_complete ?? false,
    termsAccepted: data?.terms_accepted_at != null,
  };
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
  const isGateAllowed = GATE_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

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
    // مسجّل ويحاول فتح صفحة auth → وجّهه حسب اكتمال onboarding
    if (isAuthPage) {
      const { onboardingComplete } = await getGateState(supabase, user.id);
      return redirectWithAuth(
        new URL(onboardingComplete ? "/" : "/onboarding", request.url),
        supabaseResponse
      );
    }

    // بوابة onboarding + terms للمستخدم المسجّل.
    // تحسين الأداء: عند اكتمال الشرطين نخزّن user.id في كوكي `gate_ok`، فلا
    // نستعلم قاعدة البيانات في كل تنقّل — فقط حتى يجتاز البوابة لأول مرة.
    if (!isGateAllowed) {
      const gateCookie = request.cookies.get("gate_ok")?.value;
      if (gateCookie !== user.id) {
        const { onboardingComplete, termsAccepted } = await getGateState(supabase, user.id);

        // أولوية onboarding ثم terms
        if (!onboardingComplete) {
          return redirectWithAuth(new URL("/onboarding", request.url), supabaseResponse);
        }
        if (!termsAccepted) {
          const url = new URL("/auth/accept-terms", request.url);
          if (pathname !== "/") url.searchParams.set("next", pathname);
          return redirectWithAuth(url, supabaseResponse);
        }

        // الشرطان مكتملان → خزّن النتيجة
        supabaseResponse.cookies.set("gate_ok", user.id, {
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
