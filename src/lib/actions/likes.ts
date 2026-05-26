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

export async function getPostReactions(postId: string): Promise<ReactorUser[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: likes } = await (supabase as any)
    .from('likes')
    .select('user_id, reaction_type')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(200) as { data: { user_id: string; reaction_type: string }[] | null };

  if (!likes?.length) return [];

  const userIds = [...new Set(likes.map((l) => l.user_id))];

  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', userIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

  return likes.map((like) => ({
    user_id: like.user_id,
    username: userMap.get(like.user_id)?.username ?? '',
    full_name: userMap.get(like.user_id)?.full_name ?? '',
    avatar_url: profileMap.get(like.user_id)?.avatar_url ?? null,
    reaction: like.reaction_type ?? 'like',
  }));
}

export async function getCommentReactions(commentId: string): Promise<ReactorUser[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commentLikes } = await (supabase as any)
    .from('comment_likes')
    .select('user_id, reaction_type')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: false })
    .limit(200) as { data: { user_id: string; reaction_type: string }[] | null };

  if (!commentLikes?.length) return [];

  const userIds = [...new Set(commentLikes.map((l) => l.user_id))];

  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', userIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', userIds),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

  return commentLikes.map((like) => ({
    user_id: like.user_id,
    username: userMap.get(like.user_id)?.username ?? '',
    full_name: userMap.get(like.user_id)?.full_name ?? '',
    avatar_url: profileMap.get(like.user_id)?.avatar_url ?? null,
    reaction: like.reaction_type ?? 'like',
  }));
}
