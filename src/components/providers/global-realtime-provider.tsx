'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { usePresenceSystem } from '@/hooks/use-presence-system';
import { myPrivacyStore, type MyPrivacy } from '@/lib/presence/my-privacy-store';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = { currentUserId: string; presencePrivacy: MyPrivacy };

function isConversationMuted(conversations: ConversationRow[] | undefined, convId: string): boolean {
  const conv = conversations?.find((c) => c.id === convId);
  if (!conv?.is_muted) return false;
  // muted_until = null means muted forever
  if (!conv.muted_until) return true;
  return new Date(conv.muted_until) > new Date();
}

export function GlobalRealtimeProvider({ currentUserId, presencePrivacy }: Props) {
  // Seed the privacy store once, synchronously, BEFORE any presence hook reads
  // it. A lazy useState initializer runs during the first render, ahead of all
  // effects — so usePresenceSystem starts with the correct privacy values.
  useState(() => {
    myPrivacyStore.set(presencePrivacy);
    return null;
  });

  // ── Presence system ──────────────────────────────────────────────────────
  // Tracks the current user's online status and feeds presenceStore for all.
  usePresenceSystem(currentUserId);
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

          // لا تُشغّل الصوت إذا كانت المحادثة مكتومة
          const conversations = queryClient.getQueryData<ConversationRow[]>(['conversations']);
          if (!isConversationMuted(conversations, msg.conversation_id)) {
            playMessage();
          }

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

          // Signal the notifications page (if open) to prepend the new item
          window.dispatchEvent(new CustomEvent('chof:new-notification'));

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
