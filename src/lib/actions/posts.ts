'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { postSchema } from '@/lib/validations/post';
import type { CreatePostInput, PostMedia, PostWithAuthor } from '@/lib/validations/post';

export async function createPost(
  input: CreatePostInput
): Promise<{ data?: PostWithAuthor; error?: string }> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { content, media } = parsed.data;

  const [userRes, profileRes] = await Promise.all([
    supabase
      .from('users')
      .select('username, full_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single(),
  ]);

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: content?.trim() || null,
      // jsonb column — cast needed since Supabase types it as Json
      media: media as unknown as never,
    })
    .select('id, content, media, likes_count, comments_count, created_at')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/feed');
  if (userRes.data?.username) {
    revalidatePath(`/profile/${userRes.data.username}`);
  }

  return {
    data: {
      id: post.id as string,
      content: post.content as string | null,
      media: ((post.media as unknown) ?? []) as PostMedia[],
      likes_count: (post.likes_count as number) ?? 0,
      comments_count: (post.comments_count as number) ?? 0,
      created_at: post.created_at as string,
      author_id: user.id,
      author: {
        id: user.id,
        username: userRes.data?.username ?? '',
        full_name: userRes.data?.full_name ?? '',
        avatar_url: profileRes.data?.avatar_url ?? null,
      },
    },
  };
}
