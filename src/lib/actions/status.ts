'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type StatusWithUser = {
  id: string;
  user_id: string;
  content: string;
  background_color: string;
  created_at: string;
  expires_at: string;
  views_count: number;
  viewed: boolean;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

// ── Fetch active statuses from people the current user follows + own ──────
export async function getActiveStatuses(): Promise<StatusWithUser[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // IDs of people the user follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  const relevantIds = [...followingIds, user.id];

  const now = new Date().toISOString();

  // Fetch active statuses
  const { data: rawStatuses } = await supabase
    .from('status_updates')
    .select('id, user_id, content, background_color, created_at, expires_at, views_count')
    .in('user_id', relevantIds)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (!rawStatuses || rawStatuses.length === 0) return [];

  // User IDs in these statuses
  const userIds = [...new Set(rawStatuses.map((s) => s.user_id))];

  // Fetch user details + profiles in parallel
  const [usersRes, profilesRes, viewsRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, full_name')
      .in('id', userIds),
    supabase
      .from('profiles')
      .select('user_id, avatar_url')
      .in('user_id', userIds),
    supabase
      .from('status_views')
      .select('status_id')
      .eq('viewer_id', user.id)
      .in(
        'status_id',
        rawStatuses.map((s) => s.id),
      ),
  ]);

  const usersMap = new Map(
    (usersRes.data ?? []).map((u) => [u.id, u]),
  );
  const profilesMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const viewedIds = new Set((viewsRes.data ?? []).map((v) => v.status_id));

  return rawStatuses
    .map((s) => {
      const u = usersMap.get(s.user_id);
      if (!u) return null;
      return {
        id: s.id,
        user_id: s.user_id,
        content: s.content,
        background_color: s.background_color,
        created_at: s.created_at,
        expires_at: s.expires_at,
        views_count: s.views_count,
        // Own statuses are always "viewed"
        viewed: viewedIds.has(s.id) || s.user_id === user.id,
        user: {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: profilesMap.get(s.user_id)?.avatar_url ?? null,
        },
      };
    })
    .filter((s): s is StatusWithUser => s !== null);
}

// ── Create a new status ────────────────────────────────────────────────────
export async function createStatus(input: {
  content: string;
  background_color: string;
}): Promise<{ data?: StatusWithUser; error?: string }> {
  const content = input.content.trim();
  if (!content) return { error: 'المحتوى لا يمكن أن يكون فارغاً' };
  if (content.length > 500) return { error: 'الحد الأقصى 500 حرف' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
  ]);

  if (!userRes.data) return { error: 'المستخدم غير موجود' };

  const { data: status, error } = await supabase
    .from('status_updates')
    .insert({
      user_id: user.id,
      content,
      background_color: input.background_color,
    })
    .select('id, user_id, content, background_color, created_at, expires_at, views_count')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/feed');

  return {
    data: {
      id: status.id,
      user_id: status.user_id,
      content: status.content,
      background_color: status.background_color,
      created_at: status.created_at,
      expires_at: status.expires_at,
      views_count: status.views_count,
      viewed: true,
      user: {
        id: userRes.data.id,
        username: userRes.data.username,
        full_name: userRes.data.full_name,
        avatar_url: profileRes.data?.avatar_url ?? null,
      },
    },
  };
}

// ── Mark a status as viewed (idempotent) ──────────────────────────────────
export async function viewStatus(statusId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // ON CONFLICT DO NOTHING via upsert
  await supabase
    .from('status_views')
    .upsert({ status_id: statusId, viewer_id: user.id }, { onConflict: 'status_id,viewer_id' });
}

// ── Delete own status ─────────────────────────────────────────────────────
export async function deleteStatus(
  statusId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { error } = await supabase
    .from('status_updates')
    .delete()
    .eq('id', statusId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/feed');
  return {};
}
