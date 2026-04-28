'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useNotificationSound } from '@/hooks/use-notification-sound';

type Props = { currentUserId: string };

export function NotificationListener({ currentUserId }: Props) {
  const queryClient = useQueryClient();
  const { playMessage } = useNotificationSound();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    // RLS ensures we only receive messages from conversations we're part of
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { sender_id: string };
          if (msg.sender_id !== currentUserId) {
            playMessage();
          }
          // Always refresh badge — covers both incoming and sent messages
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
