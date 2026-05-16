let map = new Map<string, boolean>();
const listeners = new Set<() => void>();
const EMPTY_MAP: ReadonlyMap<string, boolean> = new Map();

function notify() {
  for (const l of listeners) l();
}

export const followStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
  getSnapshot(): ReadonlyMap<string, boolean> { return map; },
  getServerSnapshot(): ReadonlyMap<string, boolean> { return EMPTY_MAP; },
  isFollowing(userId: string, fallback: boolean): boolean {
    return map.has(userId) ? (map.get(userId) as boolean) : fallback;
  },
  setFollowing(userId: string, value: boolean) {
    map = new Map(map).set(userId, value);
    notify();
  },
};
