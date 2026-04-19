'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { followUser, unfollowUser } from '@/lib/actions/follow';

export function useFollow(targetUserId: string, initialIsFollowing: boolean) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;
    startTransition(async () => {
      const prev = isFollowing;
      setIsFollowing(!prev);
      const result = prev
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);
      if (result.error) {
        setIsFollowing(prev);
        toast.error(result.error);
      }
    });
  }

  return { isFollowing, isPending, toggle };
}
