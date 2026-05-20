'use client';

/**
 * useIsOnline — true while the given user is connected (Realtime Presence).
 *
 * Reads from presenceStore. The getSnapshot returns a *boolean for this one
 * user*, so useSyncExternalStore re-renders the caller only when that user's
 * status actually flips — not on every global presence change. This matters
 * because every avatar on a feed/explore page calls this hook.
 *
 * A user who enabled "appear offline" never tracks presence, so this returns
 * false for them — privacy is enforced at the source.
 *
 * @example
 *   const isOnline = useIsOnline(post.author_id);
 */

import { useSyncExternalStore } from 'react';
import { presenceStore } from '@/lib/presence/presence-store';

export function useIsOnline(userId: string | null | undefined): boolean {
  return useSyncExternalStore(
    presenceStore.subscribe,
    () => (userId ? presenceStore.isOnline(userId) : false),
    () => false,
  );
}
