'use client';

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getPostReactions,
  getCommentReactions,
  type ReactorUser,
} from '@/lib/actions/likes';

export type ReactionEntity = 'post' | 'comment';

const reactorsKey = (type: ReactionEntity, entityId: string) =>
  ['reactors', type, entityId] as const;

function fetchReactors(type: ReactionEntity, entityId: string): Promise<ReactorUser[]> {
  return type === 'post' ? getPostReactions(entityId) : getCommentReactions(entityId);
}

/**
 * Reactor list for the "who reacted" modal. Cached by entity so a second
 * open is instant, and warmable via {@link prefetchReactors} on hover.
 */
export function useReactors(type: ReactionEntity, entityId: string, enabled: boolean) {
  return useQuery({
    queryKey: reactorsKey(type, entityId),
    queryFn: () => fetchReactors(type, entityId),
    enabled: enabled && !!entityId,
    staleTime: 30_000,
  });
}

/** Populate the cache ahead of a click (e.g. on pointer-enter of the summary). */
export function prefetchReactors(
  queryClient: QueryClient,
  type: ReactionEntity,
  entityId: string,
) {
  if (!entityId) return;
  void queryClient.prefetchQuery({
    queryKey: reactorsKey(type, entityId),
    queryFn: () => fetchReactors(type, entityId),
    staleTime: 30_000,
  });
}

/** Hook helper returning a stable prefetch trigger. */
export function usePrefetchReactors() {
  const queryClient = useQueryClient();
  return (type: ReactionEntity, entityId: string) =>
    prefetchReactors(queryClient, type, entityId);
}
