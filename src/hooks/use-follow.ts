'use client';

import { useSyncExternalStore, useTransition } from 'react';
import { toast } from 'sonner';
import { followUser, unfollowUser } from '@/lib/actions/follow';
import { followStore } from '@/lib/stores/follow-store';

export function useFollow(targetUserId: string, initialIsFollowing: boolean) {
  const followMap = useSyncExternalStore(followStore.subscribe, followStore.getSnapshot);
  const isFollowing = followMap.has(targetUserId)
    ? (followMap.get(targetUserId) as boolean)
    : initialIsFollowing;
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;
    const prev = isFollowing;
    followStore.setFollowing(targetUserId, !prev);
    startTransition(async () => {
      const result = prev
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);
      if (result.error) {
        followStore.setFollowing(targetUserId, prev);
        toast.error(result.error);
      }
    });
  }

  return { isFollowing, isPending, toggle };
}
