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
