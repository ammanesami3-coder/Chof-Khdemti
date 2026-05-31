import type { createClient } from '@/lib/supabase/server';
import { OFFICIAL_ACCOUNT_ID, OFFICIAL_USERNAME } from '@/lib/constants/official';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the official platform account's user id (server-side).
 *
 * Priority: the configured public UUID, then a lookup by the reserved
 * username. Returns null when no official account exists yet, so callers
 * degrade gracefully (no pinned posts / global stories).
 */
export async function resolveOfficialAccountId(
  supabase: SupabaseClient,
): Promise<string | null> {
  if (OFFICIAL_ACCOUNT_ID) return OFFICIAL_ACCOUNT_ID;

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('username', OFFICIAL_USERNAME)
    .maybeSingle();

  return data?.id ?? null;
}
