'use client';

/**
 * useMyPrivacy — reactive access to the current user's presence-privacy flags.
 *
 * Re-renders the caller whenever the user flips a presence toggle on the
 * privacy page, so the whole app reacts in realtime without a reload.
 */

import { useSyncExternalStore } from 'react';
import { myPrivacyStore, type MyPrivacy } from '@/lib/presence/my-privacy-store';

export function useMyPrivacy(): MyPrivacy {
  return useSyncExternalStore(
    myPrivacyStore.subscribe,
    myPrivacyStore.getSnapshot,
    myPrivacyStore.getServerSnapshot,
  );
}
