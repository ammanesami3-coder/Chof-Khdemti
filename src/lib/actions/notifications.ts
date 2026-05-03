'use server';

import { createClient } from '@/lib/supabase/server';

export type NotificationItem = {
  id: string;
  type: 'like' | 'comment' | 'comment_reply' | 'comment_like' | 'follow';
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  comment_id: string | null;
  actor: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  post_thumbnail: string | null;
};

export async function getNotifications(limit = 20, offset = 0) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] as NotificationItem[], error: 'Unauthorized' };

  const { data, error } = await supabase.rpc('get_notifications', {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) return { data: [] as NotificationItem[], error: error.message };

  const notifications: NotificationItem[] = (data ?? []).map((row) => {
    let thumbnail: string | null = null;
    if (Array.isArray(row.post_media) && row.post_media.length > 0) {
      const first = row.post_media[0];
      thumbnail = first?.thumbnail ?? first?.url ?? null;
    }

    return {
      id: row.id,
      type: row.type as NotificationItem['type'],
      is_read: row.is_read,
      created_at: row.created_at,
      post_id: row.post_id,
      comment_id: row.comment_id,
      actor: {
        id: row.actor_id,
        username: row.actor_username,
        full_name: row.actor_full_name,
        avatar_url: row.actor_avatar_url,
      },
      post_thumbnail: thumbnail,
    };
  });

  return { data: notifications, error: null };
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
}
