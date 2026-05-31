'use server';

import { createClient } from '@/lib/supabase/server';

export type ContentReportReason =
  | 'spam'
  | 'fraud'
  | 'inappropriate'
  | 'harassment'
  | 'impersonation'
  | 'other';

const REASONS: ContentReportReason[] = [
  'spam',
  'fraud',
  'inappropriate',
  'harassment',
  'impersonation',
  'other',
];

type ReportInput = {
  targetType: 'post' | 'comment';
  targetId: string;
  reason: ContentReportReason;
};

/**
 * File a report on a post or comment into public.content_reports.
 * RLS allows any authenticated user to INSERT their own report; moderators /
 * admins read & triage them. Soft-dedupes pending reports from the same user
 * on the same target so a user can't spam the queue.
 */
export async function submitContentReport(
  input: ReportInput,
): Promise<{ success: boolean; error?: string; already?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'يجب تسجيل الدخول أولاً' };

  if (input.targetType !== 'post' && input.targetType !== 'comment') {
    return { success: false, error: 'Invalid target' };
  }
  if (!REASONS.includes(input.reason)) {
    return { success: false, error: 'Invalid reason' };
  }

  const isPost = input.targetType === 'post';
  const targetColumn = isPost ? 'target_post_id' : 'target_comment_id';

  // Soft-dedupe: ignore a repeat pending report from the same reporter.
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq(targetColumn, input.targetId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return { success: false, already: true };

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    target_post_id: isPost ? input.targetId : null,
    target_comment_id: isPost ? null : input.targetId,
    reason: input.reason,
    status: 'pending',
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
