'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useNotificationSound } from '@/hooks/use-notification-sound';

type Props = { currentUserId: string };

export function GlobalRealtimeProvider({ currentUserId }: Props) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { playMessage, playNotification } = useNotificationSound();
  const supabaseRef = useRef(createClient());

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel('global-realtime-notifications')

      // ── 1. رسالة جديدة ────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string; conversation_id: string };
          if (msg.sender_id === currentUserId) return;

          const isInsideThisConversation =
            pathnameRef.current === `/messages/${msg.conversation_id}`;
          if (isInsideThisConversation) return;

          queryClient.setQueryData(
            ['unread-messages-count'],
            (old: number | undefined) => (old ?? 0) + 1,
          );
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
          playMessage();

          if (document.visibilityState === 'hidden') {
            document.title = '🔔 رسالة جديدة — Chof Khdemti';
            const restoreTitle = () => {
              if (document.visibilityState === 'visible') {
                document.title = 'Chof Khdemti';
                document.removeEventListener('visibilitychange', restoreTitle);
              }
            };
            document.addEventListener('visibilitychange', restoreTitle);
          }
        },
      )

      // ── 2. إشعار جديد (إعجاب / تعليق / متابعة / ...) ────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          // Optimistic badge increment
          queryClient.setQueryData(
            ['unread-notifications-count'],
            (old: number | undefined) => (old ?? 0) + 1,
          );
          // Refetch list so new item appears immediately
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          playNotification();

          if (document.visibilityState === 'hidden') {
            document.title = '🔔 إشعار جديد — Chof Khdemti';
            const restoreTitle = () => {
              if (document.visibilityState === 'visible') {
                document.title = 'Chof Khdemti';
                document.removeEventListener('visibilitychange', restoreTitle);
              }
            };
            document.addEventListener('visibilitychange', restoreTitle);
          }
        },
      )

      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] channel error — falling back to polling');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, playMessage, playNotification, queryClient]);

  return null;
}
