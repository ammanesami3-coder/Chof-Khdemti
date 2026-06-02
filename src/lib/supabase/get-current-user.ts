import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Unified shape consumed by the app shell (navbar, sidebars, realtime, bottom
 * nav, composer). One place so the whole shell shares a single fetch.
 */
export type AppUser = {
  id: string;
  username: string;
  full_name: string;
  account_type: string;
  avatar_url: string | null;
  role: string;
  presence: {
    lastSeenHidden: boolean;
    onlineHidden: boolean;
    typingHidden: boolean;
  };
};

/**
 * Resolve the current user for the app shell, deduplicated per request.
 *
 * Before this existed, both `(app)/layout.tsx` AND `<Navbar>` independently
 * called `getUser()` + two table reads — 2 auth round-trips and 4 queries just
 * to paint the chrome, all serial and blocking. React `cache()` collapses every
 * caller within a single server render into ONE execution, so the shell costs a
 * single auth round-trip + one parallel pair of reads no matter how many
 * components ask for the user.
 */
export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('username, full_name, account_type').eq('id', user.id).single(),
    supabase
      .from('profiles')
      .select('avatar_url, role, last_seen_hidden, online_hidden, typing_hidden')
      .eq('user_id', user.id)
      .single(),
  ]);

  if (!userRes.data) return null;

  return {
    id: user.id,
    username: userRes.data.username,
    full_name: userRes.data.full_name,
    account_type: userRes.data.account_type,
    avatar_url: profileRes.data?.avatar_url ?? null,
    role: profileRes.data?.role ?? 'user',
    presence: {
      lastSeenHidden: profileRes.data?.last_seen_hidden ?? false,
      onlineHidden: profileRes.data?.online_hidden ?? false,
      typingHidden: profileRes.data?.typing_hidden ?? false,
    },
  };
});

/**
 * Iron-clad, server-only admin check. Reads the role fresh from the database in
 * server context (no client state, no cached cookie) — the single source of
 * truth for gating admin-only UI and routes.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const u = await getCurrentAppUser();
  return u?.role === 'admin';
});
