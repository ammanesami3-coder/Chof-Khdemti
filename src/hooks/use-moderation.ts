'use client';

import { useQuery } from '@tanstack/react-query';
import { getModerationCapabilities, type ModerationCaps } from '@/lib/actions/moderation';

const NO_CAPS: ModerationCaps = {
  isAdmin: false,
  canDeletePosts: false,
  canDeleteComments: false,
  canBanUsers: false,
  canViewReports: false,
};

/**
 * Current user's moderation capabilities, fetched once and shared across all
 * components via a single React Query cache key. Returns NO_CAPS until loaded
 * (and for non-moderators), so callers can read flags without null checks.
 */
export function useModeration(enabled = true): ModerationCaps {
  const { data } = useQuery({
    queryKey: ['moderation-caps'],
    queryFn: getModerationCapabilities,
    enabled,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
  return data ?? NO_CAPS;
}
