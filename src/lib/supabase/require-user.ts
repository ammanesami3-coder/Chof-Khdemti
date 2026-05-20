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
 */
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { supabase, user };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return { supabase, user: session.user };

  redirect('/login');
}
