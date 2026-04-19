import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = ["/feed", "/messages", "/settings", "/profile/me", "/onboarding"];
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

  // المستخدم غير مسجّل → /login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    // مسجّل ويحاول فتح صفحة auth → تحقق من onboarding
    if (isAuthPage) {
      const done = await getOnboardingComplete(supabase, user.id);
      return NextResponse.redirect(new URL(done ? "/feed" : "/onboarding", request.url));
    }

    // مسجّل وعلى مسار محمي (وليس /onboarding نفسه ولا /logout) → تحقق من onboarding
    if (isProtected && !isOnboarding && !isLogout) {
      const done = await getOnboardingComplete(supabase, user.id);
      if (!done) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
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
