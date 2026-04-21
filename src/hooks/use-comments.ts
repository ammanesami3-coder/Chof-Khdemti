'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { addComment, deleteComment, getComments } from '@/lib/actions/comments';
import type { CommentPage } from '@/lib/actions/comments';
import type { RecentComment } from '@/lib/validations/post';
import type { FeedPage } from '@/lib/queries/posts';

export function commentQueryKey(postId: string) {
  return ['comments', postId] as const;
}

// ── useComments ───────────────────────────────────────────────────────────────

export function useComments(postId: string) {
  return useInfiniteQuery<CommentPage, Error>({
    queryKey: commentQueryKey(postId),
    queryFn: ({ pageParam }) =>
      getComments(postId, pageParam as string | undefined),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 15_000,
  });
}

// ── useAddComment ─────────────────────────────────────────────────────────────

type AddCommentVars = { postId: string; content: string; tempId: string };

export function useAddComment(currentUser: {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: AddCommentVars) =>
      addComment(postId, content),

    onMutate: async ({ postId, content, tempId }: AddCommentVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });
      await qc.cancelQueries({ queryKey: ['feed'] });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId)
      );
      const prevFeed = qc.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: ['feed'],
      });

      // Optimistic comment (newest-first: prepend to first page)
      const optimistic: RecentComment = {
        id: tempId,
        content,
        created_at: new Date().toISOString(),
        author_id: currentUser.id,
        author: {
          username: currentUser.username,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
        },
      };

      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) {
            return {
              pages: [{ comments: [optimistic], nextCursor: null }],
              pageParams: [undefined],
            };
          }
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0
                ? { ...page, comments: [optimistic, ...page.comments] }
                : page
            ),
          };
        }
      );

      // Optimistic comments_count in feed cache
      qc.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p.id === postId
                  ? { ...p, comments_count: p.comments_count + 1 }
                  : p
              ),
            })),
          };
        }
      );

      return { prevComments, prevFeed, optimistic };
    },

    onError: (_err, { postId }, ctx) => {
      if (ctx?.prevComments)
        qc.setQueryData(commentQueryKey(postId), ctx.prevComments);
      if (ctx?.prevFeed)
        ctx.prevFeed.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('فشل إرسال التعليق، حاول مجدداً');
    },

    onSuccess: (real, { postId, tempId }) => {
      // Replace temp comment with real one
      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) => (c.id === tempId ? real : c)),
            })),
          };
        }
      );
    },

    onSettled: (_d, _e, { postId }) => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}

// ── useDeleteComment ──────────────────────────────────────────────────────────

type DeleteCommentVars = { commentId: string; postId: string };

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: DeleteCommentVars) => deleteComment(commentId),

    onMutate: async ({ commentId, postId }: DeleteCommentVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });
      await qc.cancelQueries({ queryKey: ['feed'] });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId)
      );
      const prevFeed = qc.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: ['feed'],
      });

      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.filter((c) => c.id !== commentId),
            })),
          };
        }
      );

      qc.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      comments_count: Math.max(0, p.comments_count - 1),
                    }
                  : p
              ),
            })),
          };
        }
      );

      return { prevComments, prevFeed };
    },

    onError: (_err, { postId }, ctx) => {
      if (ctx?.prevComments)
        qc.setQueryData(commentQueryKey(postId), ctx.prevComments);
      if (ctx?.prevFeed)
        ctx.prevFeed.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('فشل حذف التعليق، حاول مجدداً');
    },

    onSettled: (_d, _e, { postId }) => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}
