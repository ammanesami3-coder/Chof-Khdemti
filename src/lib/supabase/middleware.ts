import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // تحديث الـ session — لا تحذف هذا السطر
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // When getUser() fails (e.g. invalid/expired refresh token), Supabase SSR
    // calls setAll() with cookie-clearing values, which would be stored in
    // supabaseResponse. Returning that response clears the browser's auth cookies,
    // turning ANY auth hiccup into a forced re-login on the very next request.
    //
    // Instead, return a neutral response that leaves existing browser cookies
    // untouched. The user's session persists until they explicitly sign out or
    // the cookie's own maxAge expires. Protected pages fall back to getSession()
    // in requireUser(), which is lenient for transient failures.
    //
    // Exception: if the browser has NO auth cookies at all, the neutral response
    // is returned anyway — the middleware will redirect to /login on the next
    // protected-path request because hasAuthCookie will be false.
    return { supabaseResponse: NextResponse.next({ request }), user: null, supabase };
  }

  return { supabaseResponse, user, supabase };
}
