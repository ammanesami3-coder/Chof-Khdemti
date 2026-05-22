import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type RequireUserResult = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

/**
 * Resolves the authenticated user for a protected server page/action.
 *
 * `getUser()` can return null *transiently* — concurrent server requests
 * (the page + Next.js prefetches + RSC fetches) racing to rotate the
 * single-use refresh token, or a network blip mid-refresh. Bouncing to
 * /login on that transient null is the bug behind "random" logouts.
 *
 * So we only redirect when there is genuinely no session: `getUser()` AND
 * the locally-stored session (`getSession()` — no network, no refresh) both
 * come back empty. When a session is still present in the cookies we let the
 * page render; RLS remains the real security boundary on every query, and the
 * client recovers on its next request (which carries freshly-rotated cookies).
 *
 * The middleware already handles token rotation before this function runs.
 * If getUser() fails here it's most likely a transient issue — getSession()
 * is the safety net that prevents false logouts.
 */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (user) return { supabase, user };

  // getUser() failed — could be transient (network blip) or genuinely invalid.
  // getSession() reads from the cookie store locally without a network call,
  // so it succeeds even when getUser() hits a transient error.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return { supabase, user: session.user };

  // Both getUser() and getSession() failed → no valid session exists.
  // Log the original error for debugging but redirect cleanly.
  if (userError) {
    console.warn('[requireUser] auth error, redirecting to /login:', userError.message);
  }

  redirect('/login');
}
