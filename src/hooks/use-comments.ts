'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  addComment,
  deleteComment,
  editComment,
  toggleCommentLike,
  getComments,
} from '@/lib/actions/comments';
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

// ── Cache helpers ─────────────────────────────────────────────────────────────

function updateCommentInPages(
  old: InfiniteData<CommentPage>,
  commentId: string,
  parentCommentId: string | null | undefined,
  updater: (c: RecentComment) => RecentComment,
): InfiniteData<CommentPage> {
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      comments: page.comments.map((c) => {
        if (!parentCommentId) return updater(c);
        if (c.id === parentCommentId) {
          return { ...c, replies: (c.replies ?? []).map((r) => (r.id === commentId ? updater(r) : r)) };
        }
        return c;
      }),
    })),
  };
}

// ── useAddComment ─────────────────────────────────────────────────────────────

type AddCommentVars = {
  postId: string;
  content: string;
  tempId: string;
  parentCommentId?: string | null;
};

export function useAddComment(currentUser: {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content, parentCommentId }: AddCommentVars) =>
      addComment(postId, content, parentCommentId ?? undefined),

    onMutate: async ({ postId, content, tempId, parentCommentId }: AddCommentVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });
      await qc.cancelQueries({ queryKey: ['feed'] });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
      );
      const prevFeed = qc.getQueriesData<InfiniteData<FeedPage>>({
        queryKey: ['feed'],
      });

      const optimistic: RecentComment = {
        id: tempId,
        content,
        created_at: new Date().toISOString(),
        author_id: currentUser.id,
        likes_count: 0,
        is_liked: false,
        parent_comment_id: parentCommentId ?? null,
        author: {
          username: currentUser.username,
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url,
        },
        replies: [],
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
          if (parentCommentId) {
            // Add optimistic reply to parent's replies array
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                comments: page.comments.map((c) =>
                  c.id === parentCommentId
                    ? { ...c, replies: [...(c.replies ?? []), optimistic] }
                    : c,
                ),
              })),
            };
          }
          // Top-level: prepend to first page
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0
                ? { ...page, comments: [optimistic, ...page.comments] }
                : page,
            ),
          };
        },
      );

      // Increment comments_count in feed
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
                  : p,
              ),
            })),
          };
        },
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

    onSuccess: (real, { postId, tempId, parentCommentId }) => {
      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          if (parentCommentId) {
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                comments: page.comments.map((c) =>
                  c.id === parentCommentId
                    ? { ...c, replies: (c.replies ?? []).map((r) => (r.id === tempId ? real : r)) }
                    : c,
                ),
              })),
            };
          }
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) => (c.id === tempId ? real : c)),
            })),
          };
        },
      );
    },

    onSettled: (_d, _e, { postId }) => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}

// ── useDeleteComment ──────────────────────────────────────────────────────────

type DeleteCommentVars = {
  commentId: string;
  postId: string;
  parentCommentId?: string | null;
};

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: DeleteCommentVars) => deleteComment(commentId),

    onMutate: async ({ commentId, postId, parentCommentId }: DeleteCommentVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });
      await qc.cancelQueries({ queryKey: ['feed'] });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
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
              comments: parentCommentId
                ? page.comments.map((c) =>
                    c.id === parentCommentId
                      ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
                      : c,
                  )
                : page.comments.filter((c) => c.id !== commentId),
            })),
          };
        },
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
                  ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
                  : p,
              ),
            })),
          };
        },
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

// ── useToggleCommentLike ──────────────────────────────────────────────────────

type ToggleLikeVars = {
  commentId: string;
  postId: string;
  parentCommentId?: string | null;
};

export function useToggleCommentLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: ToggleLikeVars) => toggleCommentLike(commentId),

    onMutate: async ({ commentId, postId, parentCommentId }: ToggleLikeVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
      );

      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return updateCommentInPages(old, commentId, parentCommentId, (c) => ({
            ...c,
            is_liked: !c.is_liked,
            likes_count: c.is_liked
              ? Math.max(0, (c.likes_count ?? 0) - 1)
              : (c.likes_count ?? 0) + 1,
          }));
        },
      );

      return { prevComments };
    },

    onError: (_err, { postId }, ctx) => {
      if (ctx?.prevComments)
        qc.setQueryData(commentQueryKey(postId), ctx.prevComments);
      toast.error('فشل تعديل الإعجاب');
    },

    onSettled: (_d, _e, { postId }) => {
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}

// ── useEditComment ────────────────────────────────────────────────────────────

type EditCommentVars = {
  commentId: string;
  postId: string;
  content: string;
  parentCommentId?: string | null;
};

export function useEditComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: EditCommentVars) =>
      editComment(commentId, content),

    onSuccess: (_data, { commentId, postId, content, parentCommentId }) => {
      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return updateCommentInPages(old, commentId, parentCommentId, (c) => ({
            ...c,
            content,
          }));
        },
      );
    },

    onError: () => {
      toast.error('فشل تعديل التعليق');
    },

    onSettled: (_d, _e, { postId }) => {
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}
