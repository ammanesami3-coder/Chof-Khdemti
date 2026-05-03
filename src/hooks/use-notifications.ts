'use client';

import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/actions/notifications';

export { type NotificationItem };

export function useUnreadNotificationsCount() {
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const { data: authData } = await supabaseRef.current.auth.getUser();
      if (!authData.user) return 0;

      const { count, error } = await supabaseRef.current
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authData.user.id)
        .eq('is_read', false);

      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  return data ?? 0;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(20, 0),
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications'], (old: { data: NotificationItem[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) =>
            n.id === id ? { ...n, is_read: true } : n,
          ),
        };
      });
      queryClient.setQueryData(
        ['unread-notifications-count'],
        (old: number | undefined) => Math.max(0, (old ?? 0) - 1),
      );
    },
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], (old: { data: NotificationItem[] } | undefined) => {
        if (!old) return old;
        return { ...old, data: old.data.map((n) => ({ ...n, is_read: true })) };
      });
      queryClient.setQueryData(['unread-notifications-count'], 0);
    },
  });

  return {
    notifications: query.data?.data ?? [],
    isLoading: query.isLoading,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}
