import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Sign-out is a state-mutating action, so it MUST live behind POST only.
 *
 * A GET handler that calls signOut() is unsafe: Next.js `<Link>` prefetches
 * routes as they enter the viewport, and link scanners / browsers may issue
 * speculative GETs. A logout link on the settings page therefore got
 * prefetched and silently destroyed the session — the root cause of the
 * "random logouts while browsing /settings/*" bug. Clients now log out via
 * `fetch('/logout', { method: 'POST' })` (see <LogoutButton />).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

/**
 * GET is intentionally side-effect-free: it never signs the user out. A stray
 * prefetch or direct navigation just lands on /login without touching the
 * session. Real logout happens through POST above.
 */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}
