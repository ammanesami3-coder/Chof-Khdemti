'use server';

import { createClient } from '@/lib/supabase/server';

export async function followUser(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };
  if (user.id === targetUserId) return { error: 'لا يمكنك متابعة نفسك' };

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId });

  if (error) return { error: error.message };
  return {};
}

export async function unfollowUser(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) return { error: error.message };
  return {};
}

// ── Follow / following lists (Facebook-style) ──────────────────────────────

export type FollowListUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_subscribed: boolean;
  /** Whether the viewer currently follows this user */
  is_following: boolean;
  /** True when this row is the viewer themselves */
  is_self: boolean;
};

export type FollowListResult =
  | { restricted: true; users?: never }
  | { restricted?: false; users: FollowListUser[] };

type ListType = 'followers' | 'following';
type Visibility = 'everyone' | 'followers' | 'none';

const PAGE = 200;

/**
 * Returns the followers / following list for `ownerId`, gated by the owner's
 * who_can_see_followers / who_can_see_following privacy setting.
 * The owner always sees their own lists; otherwise the viewer must satisfy the
 * 'everyone' | 'followers' | 'none' policy (mirrors profile_visibility).
 */
export async function getFollowList(
  ownerId: string,
  type: ListType,
): Promise<FollowListResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;
  const isOwner = viewerId === ownerId;

  // 1. Resolve the owner's visibility policy for this list (default 'everyone').
  let policy: Visibility = 'everyone';
  {
    const column = type === 'followers' ? 'who_can_see_followers' : 'who_can_see_following';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prof } = await (supabase as any)
      .from('profiles')
      .select(column)
      .eq('user_id', ownerId)
      .single();
    policy = ((prof as Record<string, string> | null)?.[column] as Visibility) ?? 'everyone';
  }

  if (!isOwner) {
    if (policy === 'none') return { restricted: true };
    if (policy === 'followers') {
      if (!viewerId) return { restricted: true };
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', viewerId)
        .eq('following_id', ownerId);
      if (!count) return { restricted: true };
    }
  }

  // 2. Fetch the relevant follow edges.
  //    followers  → rows where following_id = owner  → the follower_id list
  //    following  → rows where follower_id  = owner  → the following_id list
  const selectCol = type === 'followers' ? 'follower_id' : 'following_id';
  const matchCol  = type === 'followers' ? 'following_id' : 'follower_id';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: edges } = await (supabase as any)
    .from('follows')
    .select(`${selectCol}, created_at`)
    .eq(matchCol, ownerId)
    .order('created_at', { ascending: false })
    .limit(PAGE) as { data: Array<Record<string, string>> | null };

  const ids = [...new Set((edges ?? []).map((e) => e[selectCol]!))];
  if (ids.length === 0) return { users: [] };

  // 3. Resolve user + profile data, subscription status, and viewer's own follows.
  const [usersRes, profilesRes, subRes, viewerFollowsRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', ids),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', ids),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_subscribed_user_ids', { p_user_ids: ids }) as Promise<{ data: string[] | null }>,
    viewerId
      ? supabase.from('follows').select('following_id').eq('follower_id', viewerId).in('following_id', ids)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const subscribedSet = new Set<string>(subRes.data ?? []);
  const viewerFollowingSet = new Set((viewerFollowsRes.data ?? []).map((f) => f.following_id));

  // Preserve the edge order (most recent first).
  const users: FollowListUser[] = ids
    .map((id) => {
      const u = userMap.get(id);
      if (!u) return null;
      return {
        id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: profileMap.get(id)?.avatar_url ?? null,
        is_subscribed: subscribedSet.has(id),
        is_following: viewerFollowingSet.has(id),
        is_self: id === viewerId,
      };
    })
    .filter((u): u is FollowListUser => u !== null);

  return { users };
}
