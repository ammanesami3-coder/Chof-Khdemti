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

  // NOTE: we intentionally do NOT clear sb-* cookies on error here.
  // getUser() can fail transiently (network blip, mid-refresh race); nuking
  // the cookies turns a recoverable hiccup into a forced re-login. Supabase
  // manages its own cookie lifecycle — let it.
  return { supabaseResponse, user: error ? null : user, supabase };
}
