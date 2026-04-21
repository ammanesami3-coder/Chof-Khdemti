'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { RecentComment } from '@/lib/validations/post';

const contentSchema = z.string().min(1).max(500);

export type CommentPage = {
  comments: RecentComment[];
  nextCursor: string | null;
};

export async function addComment(
  postId: string,
  content: string
): Promise<RecentComment> {
  const parsed = contentSchema.safeParse(content.trim());
  if (!parsed.success) throw new Error('محتوى التعليق غير صالح');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: user.id, content: parsed.data })
    .select('id, content, created_at, author_id')
    .single();

  if (error) throw new Error(error.message);

  const { data: author } = await supabase
    .from('users')
    .select('username, full_name')
    .eq('id', user.id)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', user.id)
    .single();

  return {
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    author_id: user.id,
    author: {
      username: author?.username ?? '',
      full_name: author?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? null,
    },
  };
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // RLS policies enforce: author or post owner may delete
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) throw new Error(error.message);
}

const PAGE_SIZE = 20;

export async function getComments(
  postId: string,
  cursor?: string
): Promise<CommentPage> {
  const supabase = await createClient();

  let query = supabase
    .from('comments')
    .select('id, content, created_at, author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const items = rows ?? [];
  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;

  if (!page.length) return { comments: [], nextCursor: null };

  const authorIds = [...new Set(page.map((c) => c.author_id))];
  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', authorIds),
  ]);

  const userMap = new Map(usersRes.data?.map((u) => [u.id, u]) ?? []);
  const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) ?? []);

  const comments: RecentComment[] = page.map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    author_id: c.author_id,
    author: {
      username: userMap.get(c.author_id)?.username ?? '',
      full_name: userMap.get(c.author_id)?.full_name ?? '',
      avatar_url: profileMap.get(c.author_id)?.avatar_url ?? null,
    },
  }));

  return {
    comments,
    nextCursor: hasMore ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}
