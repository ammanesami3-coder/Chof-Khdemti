'use server';

import { createClient } from '@/lib/supabase/server';

type SavedRow = { post_id: string };

export async function toggleSavePost(postId: string): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: 'يجب تسجيل الدخول أولاً' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: existing } = await db
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle() as { data: SavedRow | null };

  if (existing) {
    const { error } = await db
      .from('saved_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);
    if (error) return { saved: true, error: (error as { message: string }).message };
    return { saved: false };
  } else {
    const { error } = await db
      .from('saved_posts')
      .insert({ user_id: user.id, post_id: postId });
    if (error) return { saved: false, error: (error as { message: string }).message };
    return { saved: true };
  }
}

export async function getSavedPostIds(postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds) as { data: SavedRow[] | null };

  return new Set((data ?? []).map((r) => r.post_id));
}
