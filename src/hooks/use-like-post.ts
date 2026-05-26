'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toggleReaction, type ToggleReactionResult } from '@/lib/actions/likes';
import type { FeedPage } from '@/lib/queries/posts';

type PatchArgs = {
  reaction: string | null;
  count: number;
  summary: Record<string, number>;
};

function patchPost(
  old: InfiniteData<FeedPage> | undefined,
  postId: string,
  patch: (prev: { reaction: string | null; count: number; summary: Record<string, number> }) => PatchArgs
): InfiniteData<FeedPage> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => {
        if (p.id !== postId) return p;
        const { reaction, count, summary } = patch({
          reaction: p.user_reaction ?? null,
          count: p.likes_count,
          summary: p.reactions_summary ?? {},
        });
        return {
          ...p,
          is_liked: reaction !== null,
          user_reaction: reaction,
          likes_count: count,
          reactions_summary: summary,
        };
      }),
    })),
  };
}

/** Compute an updated reactions_summary after an optimistic toggle */
function patchSummary(
  summary: Record<string, number>,
  prevReaction: string | null,
  nextReaction: string | null,
): Record<string, number> {
  const s = { ...summary };
  if (prevReaction) {
    s[prevReaction] = Math.max(0, (s[prevReaction] ?? 1) - 1);
    if (s[prevReaction] === 0) delete s[prevReaction];
  }
  if (nextReaction) {
    s[nextReaction] = (s[nextReaction] ?? 0) + 1;
  }
  return s;
}

type MutationVars = { postId: string; reaction?: string };
type MutationContext = { snapshots: [readonly unknown[], InfiniteData<FeedPage> | undefined][] };

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation<ToggleReactionResult, Error, MutationVars, MutationContext>({
    mutationFn: ({ postId, reaction = 'like' }) => toggleReaction(postId, reaction),

    onMutate: async ({ postId, reaction = 'like' }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      const snapshots = queryClient.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: ['feed'],
      });

      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) =>
          patchPost(old, postId, ({ reaction: prev, count, summary }) => {
            // Same reaction → toggle off; different → switch; none → add
            const next = prev === reaction ? null : reaction;
            return {
              reaction: next,
              count:
                prev === null
                  ? count + 1
                  : next === null
                    ? Math.max(0, count - 1)
                    : count,
              summary: patchSummary(summary, prev, next),
            };
          })
      );

      return { snapshots };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [queryKey, data] of context.snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error('فشل الإعجاب، حاول مجدداً');
    },

    onSuccess: (result, { postId }) => {
      // Apply authoritative server state — count + reaction + summary all from DB.
      // This eliminates the flicker that used to happen when the post-mutation
      // refetch returned data that didn't match optimistic state.
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) =>
          patchPost(old, postId, () => ({
            reaction: result.reaction,
            count: result.newCount,
            summary: result.newSummary,
          }))
      );
    },

    // NOTE: intentionally no onSettled invalidate. Server returns authoritative
    // state in onSuccess; refetching the whole feed would cause the badge to
    // flicker between optimistic + refetched states. Other users' reactions
    // sync naturally on next manual feed refresh / page navigation.
  });
}
