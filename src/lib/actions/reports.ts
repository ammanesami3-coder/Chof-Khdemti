'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getModerationCapabilities, type ModerationCaps } from './moderation';

export type ReportRow = {
  id: string;
  reason: string | null;
  created_at: string;
  reporterUsername: string | null;
  reporterName: string | null;
  targetType: 'post' | 'comment';
  targetId: string;
  /** Post to link to (the post itself, or the comment's parent post). */
  postId: string | null;
  preview: string;
  authorUsername: string | null;
};

/**
 * Fetch the pending content-report queue for moderators/admins.
 *
 * Runs through the caller's RLS client — content_reports SELECT is gated by
 * public.can_view_reports(), so a user without the permission simply gets
 * nothing back. We also short-circuit on the capability flag for a clean empty
 * result. Posts/comments/users are world-readable, so the enrichment joins
 * resolve under normal RLS.
 */
export async function getContentReports(): Promise<{
  caps: ModerationCaps;
  reports: ReportRow[];
}> {
  const caps = await getModerationCapabilities();
  if (!caps.canViewReports) return { caps, reports: [] };

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('content_reports')
    .select('id, reporter_id, target_post_id, target_comment_id, reason, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!rows || rows.length === 0) return { caps, reports: [] };

  const reporterIds = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))] as string[];
  const postIds = [...new Set(rows.map((r) => r.target_post_id).filter(Boolean))] as string[];
  const commentIds = [...new Set(rows.map((r) => r.target_comment_id).filter(Boolean))] as string[];

  let posts: { id: string; content: string | null; author_id: string }[] = [];
  if (postIds.length) {
    const { data } = await supabase
      .from('posts')
      .select('id, content, author_id')
      .in('id', postIds);
    posts = data ?? [];
  }

  let comments: { id: string; content: string | null; author_id: string; post_id: string }[] = [];
  if (commentIds.length) {
    const { data } = await supabase
      .from('comments')
      .select('id, content, author_id, post_id')
      .in('id', commentIds);
    comments = data ?? [];
  }

  const authorIds = [...posts.map((p) => p.author_id), ...comments.map((c) => c.author_id)];
  const userIds = [...new Set([...reporterIds, ...authorIds])];

  let users: { id: string; username: string; full_name: string }[] = [];
  if (userIds.length) {
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name')
      .in('id', userIds);
    users = data ?? [];
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  const reports: ReportRow[] = rows.map((r) => {
    const reporter = r.reporter_id ? userMap.get(r.reporter_id) : undefined;
    const base = {
      id: r.id,
      reason: r.reason,
      created_at: r.created_at,
      reporterUsername: reporter?.username ?? null,
      reporterName: reporter?.full_name ?? null,
    };

    if (r.target_post_id) {
      const p = postMap.get(r.target_post_id);
      const author = p?.author_id ? userMap.get(p.author_id) : undefined;
      return {
        ...base,
        targetType: 'post',
        targetId: r.target_post_id,
        postId: r.target_post_id,
        preview: (p?.content ?? '').slice(0, 180),
        authorUsername: author?.username ?? null,
      };
    }

    const c = r.target_comment_id ? commentMap.get(r.target_comment_id) : undefined;
    const author = c?.author_id ? userMap.get(c.author_id) : undefined;
    return {
      ...base,
      targetType: 'comment',
      targetId: r.target_comment_id ?? '',
      postId: c?.post_id ?? null,
      preview: (c?.content ?? '').slice(0, 180),
      authorUsername: author?.username ?? null,
    };
  });

  return { caps, reports };
}

/** Mark a report resolved or dismissed. Moderators with can_view_reports only. */
export async function updateReportStatus(
  reportId: string,
  status: 'resolved' | 'dismissed',
): Promise<{ success: boolean; error?: string }> {
  const caps = await getModerationCapabilities();
  if (!caps.canViewReports) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('content_reports')
    .update({ status })
    .eq('id', reportId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings/reports');
  return { success: true };
}
