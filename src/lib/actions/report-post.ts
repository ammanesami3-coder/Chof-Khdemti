'use server';

import { createClient } from '@/lib/supabase/server';

export type ReportReason =
  | 'spam'
  | 'fraud'
  | 'inappropriate'
  | 'harassment'
  | 'impersonation'
  | 'other';

export async function reportPost(
  postId: string,
  reason: ReportReason,
  details?: string,
): Promise<{ success: boolean; error?: string; already?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'يجب تسجيل الدخول أولاً' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reports')
    .insert({ reporter_id: user.id, post_id: postId, reason, details: details ?? null });

  if (error) {
    const e = error as { code: string; message: string };
    if (e.code === '23505') return { success: false, already: true };
    return { success: false, error: e.message };
  }

  return { success: true };
}
