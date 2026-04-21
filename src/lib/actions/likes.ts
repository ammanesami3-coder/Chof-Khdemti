'use server';

import { createClient } from '@/lib/supabase/server';

type ToggleLikeResult = { liked: boolean; newCount: number };

export async function toggleLike(postId: string): Promise<ToggleLikeResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Check current state
  const { data: existing } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: postId });
    if (error) throw new Error(error.message);
  }

  // Triggers in 0003 already updated likes_count — just read it back
  const { data: post } = await supabase
    .from('posts')
    .select('likes_count')
    .eq('id', postId)
    .single();

  return { liked: !existing, newCount: post?.likes_count ?? 0 };
}
