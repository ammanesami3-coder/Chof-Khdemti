import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// المسارات التي تتطلب تسجيل دخول
const PROTECTED_PATHS = ["/feed", "/messages", "/settings", "/profile/me"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا كان مسجلاً ويحاول الوصول لصفحات المصادقة — أعد توجيهه للفيد
  const AUTH_PATHS = ["/login", "/signup"];
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * طبّق الـ middleware على كل المسارات ما عدا:
     * - _next/static (ملفات ثابتة)
     * - _next/image (تحسين الصور)
     * - favicon.ico, sitemap.xml, robots.txt
     * - ملفات الـ public
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
