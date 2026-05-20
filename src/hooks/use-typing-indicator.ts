'use client';

/**
 * useTypingIndicator — realtime "is typing…" for a conversation.
 *
 * Transport: Supabase Realtime Broadcast (no DB writes, near-zero latency).
 * One channel per conversation: `typing:{conversationId}`.
 *
 * Fixes over the previous version:
 *   - ONE subscribed channel reused for both send AND receive. The old code
 *     called supabase.channel(...) again inside onTyping(), creating a fresh
 *     unsubscribed channel every keystroke — sends silently no-op'd.
 *   - Explicit "stopped" event so the indicator disappears instantly when the
 *     partner stops, instead of waiting for a timeout (kills the flicker).
 *   - Throttled sends + a debounced auto-stop → no event spam.
 *   - Privacy + reciprocity: if the current user disabled "typing", they do
 *     not broadcast typing AND do not subscribe to receive it.
 *
 * Returns:
 *   - isPartnerTyping: boolean
 *   - onTyping(text): call on every keystroke (pass the textarea value)
 *   - stopTyping(): call when the message is sent / input blurs
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMyPrivacy } from '@/hooks/use-my-privacy';

/** Auto-clear the partner's indicator if no event arrives within this window. */
const TYPING_SAFETY_MS = 6_000;
/** Minimum gap between outgoing "typing" pings (avoid flooding). */
const SEND_THROTTLE_MS = 1_800;
/** Silence after the last keystroke before we broadcast "stopped". */
const STOP_DEBOUNCE_MS = 3_000;

type TypingPayload = { user_id?: string };

export function useTypingIndicator(conversationId: string, currentUserId: string) {
  const supabase = useRef(createClient()).current;
  const { typingHidden } = useMyPrivacy();
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const lastSentRef = useRef(0);
  /** Have we broadcast "typing" that still needs a matching "stopped"? */
  const sentTypingRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingHiddenRef = useRef(typingHidden);

  useEffect(() => {
    typingHiddenRef.current = typingHidden;
  }, [typingHidden]);

  /** Broadcast "stopped" (once) and cancel the pending auto-stop. */
  const sendStop = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (!sentTypingRef.current) return;
    sentTypingRef.current = false;
    lastSentRef.current = 0;
    if (subscribedRef.current && channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'stopped',
        payload: { user_id: currentUserId } satisfies TypingPayload,
      });
    }
  }, [currentUserId]);

  useEffect(() => {
    // Reciprocity: if typing is disabled, never subscribe — no send, no receive.
    if (typingHidden) {
      setIsPartnerTyping(false);
      return;
    }

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: TypingPayload }) => {
        if (typingHiddenRef.current) return;
        if (!payload?.user_id || payload.user_id === currentUserId) return;
        setIsPartnerTyping(true);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(
          () => setIsPartnerTyping(false),
          TYPING_SAFETY_MS,
        );
      })
      .on('broadcast', { event: 'stopped' }, ({ payload }: { payload: TypingPayload }) => {
        if (!payload?.user_id || payload.user_id === currentUserId) return;
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        setIsPartnerTyping(false);
      })
      .subscribe((status) => {
        subscribedRef.current = status === 'SUBSCRIBED';
      });

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      // Best-effort: tell the partner we stopped before tearing down.
      if (sentTypingRef.current && subscribedRef.current) {
        void channel.send({
          type: 'broadcast',
          event: 'stopped',
          payload: { user_id: currentUserId } satisfies TypingPayload,
        });
      }
      sentTypingRef.current = false;
      subscribedRef.current = false;
      channelRef.current = null;
      setIsPartnerTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase, typingHidden]);

  /** Call on every keystroke; pass the current input value. */
  const onTyping = useCallback(
    (text: string) => {
      if (typingHiddenRef.current) return;
      if (!text.trim()) {
        sendStop();
        return;
      }

      const now = Date.now();
      if (now - lastSentRef.current >= SEND_THROTTLE_MS) {
        lastSentRef.current = now;
        sentTypingRef.current = true;
        if (subscribedRef.current && channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUserId } satisfies TypingPayload,
          });
        }
      }

      // (Re)arm the debounced auto-stop.
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(sendStop, STOP_DEBOUNCE_MS);
    },
    [currentUserId, sendStop],
  );

  const stopTyping = useCallback(() => {
    sendStop();
  }, [sendStop]);

  return { isPartnerTyping, onTyping, stopTyping };
}
