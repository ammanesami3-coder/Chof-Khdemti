'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ContextValue = {
  isFollowing: (userId: string, fallback: boolean) => boolean;
  setFollowing: (userId: string, value: boolean) => void;
};

const FollowStateContext = createContext<ContextValue | null>(null);

export function FollowStateProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<ReadonlyMap<string, boolean>>(new Map());

  const isFollowing = useCallback(
    (userId: string, fallback: boolean): boolean =>
      map.has(userId) ? (map.get(userId) as boolean) : fallback,
    [map],
  );

  const setFollowing = useCallback((userId: string, value: boolean) => {
    setMap((prev) => new Map(prev).set(userId, value));
  }, []);

  return (
    <FollowStateContext.Provider value={{ isFollowing, setFollowing }}>
      {children}
    </FollowStateContext.Provider>
  );
}

export function useFollowStateContext() {
  return useContext(FollowStateContext);
}
