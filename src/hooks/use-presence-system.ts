'use client';

/**
 * usePresenceSystem — drives the current user's online presence.
 *
 * Runs once per session inside GlobalRealtimeProvider.
 *
 * Responsibilities:
 *   1. Subscribe to the Supabase Realtime Presence channel "online-users".
 *   2. track() the current user so others see the green "online" dot.
 *   3. Mirror join/leave/sync into presenceStore → the UI updates instantly.
 *   4. Write last_seen_at on tab close / inactivity / tab hidden.
 *   5. Heartbeat to keep the channel alive.
 *
 * Privacy (read live from myPrivacyStore via useMyPrivacy):
 *   - onlineHidden   → never track() → the user never appears online to anyone.
 *                      Toggling it applies immediately, no reload.
 *   - lastSeenHidden → last_seen_at is never written.
 *
 * Robustness:
 *   - DB writes throttled to once / 2 min (force=true bypasses on unload).
 *   - 30s grace period on tab-hide avoids flicker during alt-tab / navigation.
 *   - Heartbeat only while the tab is visible (saves battery).
 *   - Supabase auto-reconnects; we re-track on the next SUBSCRIBED.
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { presenceStore } from '@/lib/presence/presence-store';
import { useMyPrivacy } from '@/hooks/use-my-privacy';

// ── Tuning constants ────────────────────────────────────────────────────────

/** 10 min without activity → treated as Offline. */
const INACTIVITY_MS = 10 * 60 * 1000;
/** 30s after the tab is hidden → Offline (avoids alt-tab flicker). */
const TAB_HIDE_GRACE_MS = 30 * 1_000;
/** Minimum gap between last_seen_at DB writes. */
const LAST_SEEN_THROTTLE_MS = 2 * 60 * 1_000;
/** Heartbeat — below Supabase's ~5 min presence timeout. */
const HEARTBEAT_MS = 4 * 60 * 1_000;

type PresencePayload = { user_id: string; online_at: string };

export function usePresenceSystem(userId: string): void {
  const supabase = useRef(createClient()).current;
  const { lastSeenHidden, onlineHidden } = useMyPrivacy();

  // Live privacy values mirrored into refs so the main effect never rebuilds.
  const lastSeenHiddenRef = useRef(lastSeenHidden);
  const onlineHiddenRef = useRef(onlineHidden);

  const lastSeenWrittenAt = useRef<number>(0);
  const trackingActive = useRef<boolean>(false);
  const subscribedRef = useRef<boolean>(false);

  // Track/untrack fns are defined inside the main effect; exposed via refs so
  // the privacy effect can call them without recreating the channel.
  const trackFnRef = useRef<(() => void) | null>(null);
  const untrackFnRef = useRef<(() => void) | null>(null);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    lastSeenHiddenRef.current = lastSeenHidden;
  }, [lastSeenHidden]);

  /** Write last_seen_at — throttled, privacy-aware. force bypasses throttle. */
  const writeLastSeen = useCallback(
    async (force = false) => {
      if (lastSeenHiddenRef.current) return;
      const now = Date.now();
      if (!force && now - lastSeenWrittenAt.current < LAST_SEEN_THROTTLE_MS) {
        return;
      }
      lastSeenWrittenAt.current = now;
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', userId);
    },
    [supabase, userId],
  );

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    const doTrack = (): void => {
      if (onlineHiddenRef.current) return; // "appear offline"
      if (!subscribedRef.current) return;
      trackingActive.current = true;
      void channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      } satisfies PresencePayload);
    };

    const doUntrack = (): void => {
      trackingActive.current = false;
      void channel.untrack();
    };

    trackFnRef.current = doTrack;
    untrackFnRef.current = doUntrack;

    // ── Presence events ───────────────────────────────────────────────────
    channel
      .on('presence', { event: 'sync' }, () => {
        const raw = channel.presenceState<PresencePayload>();
        presenceStore.syncAll(Object.keys(raw));
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        presenceStore.markOnline(key);
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        const remaining = channel.presenceState<PresencePayload>()[key];
        if (!remaining || remaining.length === 0) {
          presenceStore.markOffline(key);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true;
          doTrack();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          // Auto-reconnect will fire SUBSCRIBED again → we re-track there.
          subscribedRef.current = false;
          trackingActive.current = false;
        }
      });

    // ── Inactivity detection ──────────────────────────────────────────────
    const resetInactivityTimer = (): void => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

      // Active again after an inactivity untrack → re-track.
      if (
        !trackingActive.current &&
        document.visibilityState === 'visible' &&
        !onlineHiddenRef.current
      ) {
        doTrack();
      }

      inactivityTimerRef.current = setTimeout(() => {
        doUntrack();
        void writeLastSeen();
      }, INACTIVITY_MS);
    };

    // ── Tab visibility ────────────────────────────────────────────────────
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        if (!trackingActive.current) doTrack();
        resetInactivityTimer();
      } else {
        hideTimerRef.current = setTimeout(() => {
          doUntrack();
          void writeLastSeen();
        }, TAB_HIDE_GRACE_MS);
      }
    };

    // ── Unload ────────────────────────────────────────────────────────────
    const onBeforeUnload = (): void => {
      void writeLastSeen(true);
    };

    // ── Heartbeat ─────────────────────────────────────────────────────────
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && trackingActive.current) {
        doTrack();
      }
    }, HEARTBEAT_MS);

    // ── Listeners ─────────────────────────────────────────────────────────
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    activityEvents.forEach((ev) => {
      document.addEventListener(ev, resetInactivityTimer, { passive: true });
    });

    resetInactivityTimer();

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      activityEvents.forEach((ev) => {
        document.removeEventListener(ev, resetInactivityTimer);
      });

      void writeLastSeen(true);

      trackFnRef.current = null;
      untrackFnRef.current = null;
      subscribedRef.current = false;
      trackingActive.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, writeLastSeen]);

  // React to the "appear offline" toggle without rebuilding the channel.
  useEffect(() => {
    onlineHiddenRef.current = onlineHidden;
    if (onlineHidden) {
      untrackFnRef.current?.();
      void writeLastSeen(true);
    } else if (document.visibilityState === 'visible') {
      trackFnRef.current?.();
    }
  }, [onlineHidden, writeLastSeen]);
}
