'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toggleLike } from '@/lib/actions/likes';
import type { FeedPage } from '@/lib/queries/posts';

function patchPost(
  old: InfiniteData<FeedPage> | undefined,
  postId: string,
  patch: (liked: boolean, count: number) => { liked: boolean; count: number }
): InfiniteData<FeedPage> | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => {
        if (p.id !== postId) return p;
        const { liked, count } = patch(p.is_liked ?? false, p.likes_count);
        return { ...p, is_liked: liked, likes_count: count };
      }),
    })),
  };
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLike,

    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      // Snapshot every feed query for rollback
      const snapshots = queryClient.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: ['feed'],
      });

      // Optimistically toggle in all feed queries
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) =>
          patchPost(old, postId, (wasLiked, count) => ({
            liked: !wasLiked,
            count: wasLiked ? Math.max(0, count - 1) : count + 1,
          }))
      );

      return { snapshots };
    },

    onError: (_err, _postId, context) => {
      // Rollback every query to its snapshot
      if (context?.snapshots) {
        for (const [queryKey, data] of context.snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error('فشل الإعجاب، حاول مجدداً');
    },

    onSuccess: (_result, postId) => {
      // Sync the authoritative count from the server into the cache
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) =>
          patchPost(old, postId, () => ({
            liked: _result.liked,
            count: _result.newCount,
          }))
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
