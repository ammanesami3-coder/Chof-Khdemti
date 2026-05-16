'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { StatusWithUser } from '@/lib/types/status.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShareableUser = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  conversation_id: string | null;
  has_conversation: boolean;
};

// ── Share to Story ────────────────────────────────────────────────────────────

export async function sharePostToStory(
  postId: string
): Promise<{ error?: string; status?: StatusWithUser }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { data: post } = await supabase
    .from('posts')
    .select('id, content, media')
    .eq('id', postId)
    .single();

  if (!post) return { error: 'المنشور غير موجود' };

  const media = (post.media as Array<{ type: string; url: string; thumbnail: string }>) ?? [];
  const firstMedia = media[0];

  const insertPayload = {
    user_id: user.id,
    content_type: firstMedia ? (firstMedia.type === 'video' ? 'video' : 'image') : 'text',
    content: post.content?.slice(0, 200) ?? null,
    media_url: firstMedia?.url ?? null,
    thumbnail_url: firstMedia?.thumbnail ?? null,
    background_color: firstMedia ? '#000000' : '#1877F2',
    text_color: '#FFFFFF',
    font_style: 'default',
    duration: 5,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    shared_post_id: postId,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('status_updates')
    .insert(insertPayload)
    .select('id, user_id, content_type, content, media_url, thumbnail_url, background_color, text_color, font_style, duration, created_at, expires_at, views_count, likes_count, shared_post_id')
    .single() as {
      data: {
        id: string; user_id: string; content_type: string; content: string | null;
        media_url: string | null; thumbnail_url: string | null; background_color: string;
        text_color: string; font_style: string; duration: number;
        created_at: string; expires_at: string; views_count: number;
        likes_count: number; shared_post_id: string | null;
      } | null;
      error: { message: string } | null;
    };

  if (error) return { error: error.message };
  if (!inserted) return { error: 'خطأ في الإنشاء' };

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url, cover_url').eq('user_id', user.id).single(),
  ]);

  if (!userRes.data) return { error: 'بيانات المستخدم غير موجودة' };

  revalidatePath('/');

  return {
    status: {
      id: inserted.id,
      user_id: inserted.user_id,
      content_type: inserted.content_type as 'text' | 'image' | 'video',
      content: inserted.content,
      media_url: inserted.media_url,
      thumbnail_url: inserted.thumbnail_url,
      background_color: inserted.background_color ?? '#1877F2',
      text_color: inserted.text_color ?? '#FFFFFF',
      font_style: inserted.font_style ?? 'default',
      duration: inserted.duration ?? 5,
      created_at: inserted.created_at,
      expires_at: inserted.expires_at,
      views_count: 0,
      likes_count: 0,
      viewed: true,
      my_reaction: null,
      shared_post_id: inserted.shared_post_id,
      user: {
        id: userRes.data.id,
        username: userRes.data.username,
        full_name: userRes.data.full_name,
        avatar_url: profileRes.data?.avatar_url ?? null,
        cover_url: profileRes.data?.cover_url ?? null,
      },
    },
  };
}

// ── Share to Profile (Repost) ─────────────────────────────────────────────────

const repostSchema = z.object({
  postId: z.string().uuid(),
  comment: z.string().max(500).optional(),
});

export async function sharePostToProfile(
  input: z.infer<typeof repostSchema>
): Promise<{ error?: string; postId?: string }> {
  const parsed = repostSchema.safeParse(input);
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  // Use security-definer RPC to bypass artisan-only INSERT RLS policy.
  // The function handles root-post resolution and duplicate checking internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newPostId, error } = await (supabase as any).rpc('create_repost', {
    p_original_post_id: parsed.data.postId,
    p_comment: parsed.data.comment?.trim() || null,
  }) as { data: string | null; error: { message: string } | null };

  if (error) {
    if (error.message?.includes('Already reposted')) {
      return { error: 'شاركت هذا المنشور من قبل على ملفك الشخصي' };
    }
    return { error: error.message ?? 'خطأ في الإنشاء' };
  }

  const newPost = newPostId ? { id: newPostId } : null;
  if (!newPost) return { error: 'خطأ في الإنشاء' };

  revalidatePath('/');
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();
  if (userData?.username) revalidatePath(`/profile/${userData.username}`);

  return { postId: newPost.id };
}

// ── Share via Message ─────────────────────────────────────────────────────────

const shareViaMessageSchema = z.object({
  postId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(10),
});

export async function sharePostViaMessage(
  input: z.infer<typeof shareViaMessageSchema>
): Promise<{ error?: string; sent: number }> {
  const parsed = shareViaMessageSchema.safeParse(input);
  if (!parsed.success) return { error: 'مدخلات غير صالحة', sent: 0 };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً', sent: 0 };

  let sent = 0;

  for (const targetUserId of parsed.data.userIds) {
    // Get or create conversation via DB function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: convId, error: convErr } = await (supabase as any).rpc(
      'get_or_create_conversation_for_share',
      { p_other_user_id: targetUserId }
    ) as { data: string | null; error: { message: string } | null };

    if (convErr || !convId) continue;

    // Check subscription if artisan
    const { data: conv } = await supabase
      .from('conversations')
      .select('artisan_id')
      .eq('id', convId)
      .single();

    if (conv?.artisan_id === user.id) {
      const { data: canReply } = await supabase.rpc('can_artisan_reply', {
        p_artisan_id: user.id,
      });
      if (!canReply) continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: msgErr } = await (supabase as any).from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: null,
      message_type: 'post_share',
      shared_post_id: parsed.data.postId,
    });

    if (!msgErr) {
      sent++;
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId);
    }
  }

  if (sent === 0) return { error: 'فشل الإرسال إلى جميع المستخدمين', sent: 0 };
  return { sent };
}

// ── Get shareable users ───────────────────────────────────────────────────────

export async function getShareableUsers(): Promise<ShareableUser[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_shareable_users') as {
    data: ShareableUser[] | null;
    error: { message: string } | null;
  };

  if (error || !data) return [];

  return data.map((u) => ({
    user_id: u.user_id,
    username: u.username,
    full_name: u.full_name,
    avatar_url: u.avatar_url ?? null,
    conversation_id: u.conversation_id ?? null,
    has_conversation: u.has_conversation ?? false,
  }));
}
