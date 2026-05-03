'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { RecentComment } from '@/lib/validations/post';

const contentSchema = z.string().min(1).max(500);

export type CommentPage = {
  comments: RecentComment[];
  nextCursor: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True if migration 0017 (comment_likes + parent_comment_id) is not applied yet */
function isMissingColumn(msg: string) {
  return msg.includes('does not exist') || msg.includes('column');
}

const PAGE_SIZE = 20;

// ── Fallback: getComments without migration 0017 ──────────────────────────────

async function getCommentsLegacy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  cursor: string | undefined,
): Promise<CommentPage> {
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

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

  return {
    comments: page.map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author_id: c.author_id,
      likes_count: 0,
      is_liked: false,
      parent_comment_id: null,
      author: {
        username: userMap.get(c.author_id)?.username ?? '',
        full_name: userMap.get(c.author_id)?.full_name ?? '',
        avatar_url: profileMap.get(c.author_id)?.avatar_url ?? null,
      },
      replies: [],
    })),
    nextCursor: hasMore ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}

// ── addComment ────────────────────────────────────────────────────────────────

export async function addComment(
  postId: string,
  content: string,
  parentCommentId?: string | null,
): Promise<RecentComment> {
  const parsed = contentSchema.safeParse(content.trim());
  if (!parsed.success) throw new Error('محتوى التعليق غير صالح');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Validate parent is top-level (only one nesting level)
  if (parentCommentId) {
    const { data: parent } = await supabase
      .from('comments')
      .select('id, parent_comment_id')
      .eq('id', parentCommentId)
      .single();
    if (!parent) throw new Error('التعليق الأصلي غير موجود');
    if (parent.parent_comment_id) throw new Error('لا يمكن الرد على رد');
  }

  // Try with new columns first (post-migration 0017)
  const insertPayload = {
    post_id: postId,
    author_id: user.id,
    content: parsed.data,
    ...(parentCommentId !== undefined ? { parent_comment_id: parentCommentId ?? null } : {}),
  };

  const { data: c1, error: e1 } = await supabase
    .from('comments')
    .insert(insertPayload)
    .select('id, content, created_at, author_id, likes_count, parent_comment_id')
    .single();

  let commentId: string;
  let commentContent: string;
  let commentCreatedAt: string;
  let commentParentId: string | null = null;

  if (e1) {
    if (isMissingColumn(e1.message)) {
      // Fall back: insert without new columns
      const fallbackPayload = { post_id: postId, author_id: user.id, content: parsed.data };
      const { data: c2, error: e2 } = await supabase
        .from('comments')
        .insert(fallbackPayload)
        .select('id, content, created_at, author_id')
        .single();
      if (e2 || !c2) throw new Error(e2?.message ?? 'فشل الإضافة');
      commentId = c2.id;
      commentContent = c2.content;
      commentCreatedAt = c2.created_at;
    } else {
      throw new Error(e1.message);
    }
  } else {
    if (!c1) throw new Error('فشل الإضافة');
    commentId = c1.id;
    commentContent = c1.content;
    commentCreatedAt = c1.created_at;
    commentParentId = c1.parent_comment_id ?? null;
  }

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('username, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
  ]);

  return {
    id: commentId,
    content: commentContent,
    created_at: commentCreatedAt,
    author_id: user.id,
    likes_count: 0,
    is_liked: false,
    parent_comment_id: commentParentId,
    author: {
      username: userRes.data?.username ?? '',
      full_name: userRes.data?.full_name ?? '',
      avatar_url: profileRes.data?.avatar_url ?? null,
    },
  };
}

// ── editComment ───────────────────────────────────────────────────────────────

export async function editComment(commentId: string, content: string): Promise<void> {
  const parsed = contentSchema.safeParse(content.trim());
  if (!parsed.success) throw new Error('محتوى التعليق غير صالح');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id, created_at')
    .eq('id', commentId)
    .single();

  if (!comment) throw new Error('التعليق غير موجود');
  if (comment.author_id !== user.id) throw new Error('ليس لديك صلاحية التعديل');

  const diffMs = Date.now() - new Date(comment.created_at).getTime();
  if (diffMs > 15 * 60 * 1000) throw new Error('انتهت مهلة التعديل (15 دقيقة)');

  const { error } = await supabase
    .from('comments')
    .update({ content: parsed.data })
    .eq('id', commentId);

  if (error) throw new Error(error.message);
}

// ── deleteComment ─────────────────────────────────────────────────────────────

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // RLS policies enforce: author or post owner may delete
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}

// ── toggleCommentLike ─────────────────────────────────────────────────────────

export async function toggleCommentLike(
  commentId: string,
): Promise<{ liked: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('comment_likes').delete().eq('id', existing.id);
    return { liked: false };
  }

  await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: user.id });
  return { liked: true };
}

// ── getComments ───────────────────────────────────────────────────────────────

export async function getComments(
  postId: string,
  cursor?: string,
): Promise<CommentPage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch top-level comments only (migration 0017 adds parent_comment_id + likes_count)
  let query = supabase
    .from('comments')
    .select('id, content, created_at, author_id, likes_count, parent_comment_id')
    .eq('post_id', postId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt('created_at', cursor);

  const { data: rows, error } = await query;

  // Migration 0017 not applied yet — fall back to legacy query without new columns
  if (error) {
    if (isMissingColumn(error.message)) {
      return getCommentsLegacy(supabase, postId, cursor);
    }
    throw new Error(error.message);
  }

  const items = rows ?? [];
  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;

  if (!page.length) return { comments: [], nextCursor: null };

  const topLevelIds = page.map((c) => c.id);

  // 2. Fetch replies for these top-level comments
  const { data: replyRows } = await supabase
    .from('comments')
    .select('id, content, created_at, author_id, likes_count, parent_comment_id')
    .in('parent_comment_id', topLevelIds)
    .order('created_at', { ascending: true });

  const allRows = [...page, ...(replyRows ?? [])];
  const allIds = allRows.map((c) => c.id);
  const authorIds = [...new Set(allRows.map((c) => c.author_id))];

  // 3. Fetch author data + current user's likes in parallel
  const [usersRes, profilesRes, likesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', authorIds),
    user
      ? supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', allIds)
      : Promise.resolve({ data: [] as { comment_id: string }[] }),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const likedIds = new Set((likesRes.data ?? []).map((l) => l.comment_id));

  type RawRow = (typeof allRows)[0];

  function mapRow(c: RawRow): RecentComment {
    return {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author_id: c.author_id,
      likes_count: c.likes_count,
      is_liked: likedIds.has(c.id),
      parent_comment_id: c.parent_comment_id ?? null,
      author: {
        username: userMap.get(c.author_id)?.username ?? '',
        full_name: userMap.get(c.author_id)?.full_name ?? '',
        avatar_url: profileMap.get(c.author_id)?.avatar_url ?? null,
      },
    };
  }

  // 4. Group replies under their parent comments
  const repliesByParent = new Map<string, RecentComment[]>();
  for (const reply of replyRows ?? []) {
    const parentId = reply.parent_comment_id!;
    if (!repliesByParent.has(parentId)) repliesByParent.set(parentId, []);
    repliesByParent.get(parentId)!.push(mapRow(reply));
  }

  const comments = page.map((c) => ({
    ...mapRow(c),
    replies: repliesByParent.get(c.id) ?? [],
  }));

  return {
    comments,
    nextCursor: hasMore ? (page[page.length - 1]?.created_at ?? null) : null,
  };
}
