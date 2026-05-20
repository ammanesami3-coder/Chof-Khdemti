/**
 * Global singleton that tracks which user IDs are currently online.
 *
 * Source of truth: Supabase Realtime Presence channel "online-users".
 * This store is updated by usePresenceSystem (runs inside GlobalRealtimeProvider).
 * Components read it via useIsOnline(userId).
 *
 * Uses useSyncExternalStore-compatible API:
 *   - subscribe(listener) → returns unsubscribe fn
 *   - getSnapshot() → returns a ReadonlySet (new reference only when state changes)
 *   - getServerSnapshot() → always empty Set (no online status on server)
 */

type Listener = () => void;

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

class PresenceStore {
  private _online: ReadonlySet<string> = new Set<string>();
  private _listeners = new Set<Listener>();

  /** useSyncExternalStore: subscribe */
  readonly subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  /** useSyncExternalStore: client snapshot */
  readonly getSnapshot = (): ReadonlySet<string> => this._online;

  /**
   * Per-user lookup. Used as the getSnapshot for useIsOnline so a component
   * re-renders ONLY when *its own* user's status flips — not on every change.
   */
  isOnline(userId: string): boolean {
    return this._online.has(userId);
  }

  /** useSyncExternalStore: server snapshot (always empty — no SSR presence) */
  readonly getServerSnapshot = (): ReadonlySet<string> => EMPTY_SET;

  /**
   * Full sync from presence channel "sync" event.
   * Replaces the entire online set. Only triggers re-renders if set actually changed.
   */
  syncAll(userIds: Iterable<string>): void {
    const next = new Set(userIds);
    if (!setsEqual(this._online, next)) {
      this._online = next;
      this._notify();
    }
  }

  /** Mark a single user as online (from "join" event). */
  markOnline(userId: string): void {
    if (!this._online.has(userId)) {
      const next = new Set(this._online);
      next.add(userId);
      this._online = next;
      this._notify();
    }
  }

  /** Mark a single user as offline (from "leave" event, last tab). */
  markOffline(userId: string): void {
    if (this._online.has(userId)) {
      const next = new Set(this._online);
      next.delete(userId);
      this._online = next;
      this._notify();
    }
  }

  private _notify(): void {
    this._listeners.forEach((fn) => fn());
  }
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export const presenceStore = new PresenceStore();
