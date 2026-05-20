import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Browser Supabase client — a process-wide singleton.
 *
 * Why a singleton: every call to createBrowserClient() spins up its own
 * GoTrueClient with an independent token auto-refresh timer. With several
 * clients alive at once (presence, typing, pages…) they race to rotate the
 * single-use refresh token; the loser gets "Invalid Refresh Token: Already
 * Used", which surfaced as random redirects to /login. One shared client =
 * one refresh timer = one realtime socket = no races.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}
