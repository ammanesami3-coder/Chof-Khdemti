/**
 * my-privacy-store — the CURRENT user's own presence-privacy settings.
 *
 * Why a store (not props/context):
 *   These three flags are read by many unrelated parts of the app
 *   (usePresenceSystem, useTypingIndicator, PresenceText, the avatar dot)
 *   AND they must update *instantly* the moment the user flips a toggle on
 *   the privacy page — without a full reload. An external store with a
 *   useSyncExternalStore hook gives every consumer a live, consistent value.
 *
 * Source of truth: public.profiles columns
 *   - last_seen_hidden
 *   - online_hidden
 *   - typing_hidden
 *
 * Lifecycle:
 *   - GlobalRealtimeProvider seeds it once on mount (server-fetched values).
 *   - The privacy page calls set() right after a successful DB update.
 */

export type MyPrivacy = {
  /** Hide "last seen" — also stops this user from seeing others' last seen. */
  lastSeenHidden: boolean;
  /** Appear offline — never tracked in Realtime Presence. */
  onlineHidden: boolean;
  /** Disable "typing…" — also stops this user from seeing others typing. */
  typingHidden: boolean;
};

type Listener = () => void;

const DEFAULT: MyPrivacy = {
  lastSeenHidden: false,
  onlineHidden: false,
  typingHidden: false,
};

class MyPrivacyStore {
  private _state: MyPrivacy = DEFAULT;
  private _listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  readonly getSnapshot = (): MyPrivacy => this._state;

  readonly getServerSnapshot = (): MyPrivacy => DEFAULT;

  /** Merge a partial update and notify subscribers (only if something changed). */
  set(patch: Partial<MyPrivacy>): void {
    const next: MyPrivacy = { ...this._state, ...patch };
    if (
      next.lastSeenHidden === this._state.lastSeenHidden &&
      next.onlineHidden === this._state.onlineHidden &&
      next.typingHidden === this._state.typingHidden
    ) {
      return;
    }
    this._state = next;
    this._listeners.forEach((fn) => fn());
  }
}

export const myPrivacyStore = new MyPrivacyStore();
