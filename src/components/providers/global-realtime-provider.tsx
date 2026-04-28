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
  const { playMessage } = useNotificationSound();
  const supabaseRef = useRef(createClient());

  // Keep a ref so the Realtime callback always reads the latest pathname
  // without needing to re-subscribe on every navigation.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    // RLS ensures this channel only delivers messages from conversations
    // the current user is a party to.
    const channel = supabase
      .channel('global-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string };

          if (msg.sender_id !== currentUserId) {
            // Skip sound inside a specific conversation — ChatWindow handles it there.
            // /messages (list page) still gets sound.
            const isInsideConversation = pathnameRef.current.startsWith('/messages/');
            if (!isInsideConversation) {
              playMessage();
            }

            // Flash document.title when the tab is in the background
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
          }

          // Always refresh unread badge regardless of sender
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, playMessage, queryClient]);

  return null;
}
