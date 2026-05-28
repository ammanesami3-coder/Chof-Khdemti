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
import {
  isSubscriptionRequiredError,
  showSubscriptionRequiredToast,
} from '@/lib/subscription/show-subscription-toast';
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
        if (!parentCommentId) return c.id === commentId ? updater(c) : c;
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

    onError: (err, { postId }, ctx) => {
      // Roll back optimistic updates
      if (ctx?.prevComments)
        qc.setQueryData(commentQueryKey(postId), ctx.prevComments);
      if (ctx?.prevFeed)
        ctx.prevFeed.forEach(([key, data]) => qc.setQueryData(key, data));

      // Show appropriate message: subscription required vs generic failure
      if (isSubscriptionRequiredError(err)) {
        showSubscriptionRequiredToast();
      } else {
        toast.error('فشل إرسال التعليق، حاول مجدداً');
      }
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
      // Only invalidate the comments list (so the real saved comment replaces
      // the optimistic placeholder). Don't invalidate the feed — the optimistic
      // comments_count increment is already correct, and a feed refetch would
      // cause the post card to flicker.
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
      // Only invalidate the comments list. Optimistic comments_count decrement
      // on the post is already correct; refetching the feed would flicker.
      void qc.invalidateQueries({ queryKey: commentQueryKey(postId) });
    },
  });
}

// ── useToggleCommentLike ──────────────────────────────────────────────────────

type ToggleLikeVars = {
  commentId: string;
  postId: string;
  parentCommentId?: string | null;
  reaction?: string;
};

export function useToggleCommentLike() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, reaction = 'like' }: ToggleLikeVars) =>
      toggleCommentLike(commentId, reaction),

    onMutate: async ({ commentId, postId, parentCommentId, reaction = 'like' }: ToggleLikeVars) => {
      await qc.cancelQueries({ queryKey: commentQueryKey(postId) });

      const prevComments = qc.getQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
      );

      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return updateCommentInPages(old, commentId, parentCommentId, (c) => {
            const prevReaction = c.user_reaction ?? null;
            // Same reaction → toggle off; different → switch; none → add
            const nextReaction = prevReaction === reaction ? null : reaction;

            // Patch reactions_summary optimistically
            const summary: Record<string, number> = { ...(c.reactions_summary ?? {}) };
            if (prevReaction) {
              summary[prevReaction] = Math.max(0, (summary[prevReaction] ?? 1) - 1);
              if (summary[prevReaction] === 0) delete summary[prevReaction];
            }
            if (nextReaction) {
              summary[nextReaction] = (summary[nextReaction] ?? 0) + 1;
            }

            return {
              ...c,
              is_liked: nextReaction !== null,
              user_reaction: nextReaction,
              reactions_summary: summary,
              likes_count:
                prevReaction === null
                  ? (c.likes_count ?? 0) + 1
                  : nextReaction === null
                    ? Math.max(0, (c.likes_count ?? 0) - 1)
                    : c.likes_count ?? 0,
            };
          });
        },
      );

      return { prevComments };
    },

    onError: (_err, { postId }, ctx) => {
      if (ctx?.prevComments)
        qc.setQueryData(commentQueryKey(postId), ctx.prevComments);
      toast.error('فشل تعديل الإعجاب');
    },

    onSuccess: (result, { commentId, postId, parentCommentId }) => {
      // Apply server-authoritative state (count, reaction, summary) — prevents
      // the badge from flickering between optimistic and refetched data.
      qc.setQueryData<InfiniteData<CommentPage>>(
        commentQueryKey(postId),
        (old) => {
          if (!old) return old;
          return updateCommentInPages(old, commentId, parentCommentId, (c) => ({
            ...c,
            is_liked: result.reacted,
            user_reaction: result.reaction,
            likes_count: result.newCount,
            reactions_summary: result.newSummary,
          }));
        },
      );
    },

    // NOTE: no onSettled invalidate. Server returns authoritative state in
    // onSuccess; refetching would cause the badge to flicker.
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
