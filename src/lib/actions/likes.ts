'use server';

import { createClient } from '@/lib/supabase/server';

export type ToggleReactionResult = {
  reacted: boolean;
  reaction: string | null;
  newCount: number;
  newSummary: Record<string, number>;
};

export async function toggleReaction(
  postId: string,
  reaction = 'like',
): Promise<ToggleReactionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('toggle_reaction', {
    p_post_id:  postId,
    p_reaction: reaction,
  }) as {
    data: {
      reacted: boolean;
      reaction: string | null;
      new_count: number;
      new_summary?: Record<string, number>;
    } | null;
    error: unknown;
  };

  if (error) throw new Error(String(error));

  return {
    reacted:    data?.reacted    ?? false,
    reaction:   data?.reaction   ?? null,
    newCount:   data?.new_count  ?? 0,
    newSummary: data?.new_summary ?? {},
  };
}

/** Backward-compat alias used by any remaining code that calls toggleLike */
export async function toggleLike(postId: string): Promise<{ liked: boolean; newCount: number }> {
  const result = await toggleReaction(postId, 'like');
  return { liked: result.reacted, newCount: result.newCount };
}

export type ReactorUser = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  reaction: string;
};

/**
 * Shared reactor-lookup used by both post and comment reaction lists.
 * One reactions query, then user + profile rows resolved in a single
 * parallel round trip.
 */
async function fetchReactors(
  table: 'likes' | 'comment_likes',
  idColumn: 'post_id' | 'comment_id',
  entityId: string,
): Promise<ReactorUser[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from(table)
    .select('user_id, reaction_type')
    .eq(idColumn, entityId)
    .order('created_at', { ascending: false })
    .limit(200) as { data: { user_id: string; reaction_type: string }[] | null };

  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', userIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

  return rows.map((row) => ({
    user_id: row.user_id,
    username: userMap.get(row.user_id)?.username ?? '',
    full_name: userMap.get(row.user_id)?.full_name ?? '',
    avatar_url: profileMap.get(row.user_id)?.avatar_url ?? null,
    reaction: row.reaction_type ?? 'like',
  }));
}

export async function getPostReactions(postId: string): Promise<ReactorUser[]> {
  return fetchReactors('likes', 'post_id', postId);
}

export async function getCommentReactions(commentId: string): Promise<ReactorUser[]> {
  return fetchReactors('comment_likes', 'comment_id', commentId);
}
