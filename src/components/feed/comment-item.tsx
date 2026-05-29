"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar, fr, enUS } from "date-fns/locale";
import { Send } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AuthGate } from "@/components/shared/auth-gate";
import { CommentReactionButton } from "@/components/feed/comment-reaction-button";
import {
  useDeleteComment,
  useEditComment,
  useAddComment,
} from "@/hooks/use-comments";
import { getReaction, getTopReactions, type Reaction } from "@/lib/constants/reactions";
import { useLang } from "@/lib/i18n/language-context";
import type { RecentComment } from "@/lib/validations/post";
import { ReactionsModalLazy, preloadReactionsModal } from "@/components/feed/reactions-modal-lazy";
import { usePrefetchReactors } from "@/hooks/use-reactors";
import { SubscribedBadge } from "@/components/shared/subscribed-badge";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  comment: RecentComment;
  postId: string;
  currentUser?: CurrentUser;
  postAuthorId?: string;
  isAuthenticated?: boolean;
  depth?: number;
  isPending?: boolean;
};

export function CommentItem({
  comment,
  postId,
  currentUser,
  postAuthorId,
  isAuthenticated = !!currentUser,
  depth = 0,
  isPending = false,
}: Props) {
  const { t, lang } = useLang();
  const prefetchReactors = usePrefetchReactors();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);

  // Derive reaction state from TQ-managed comment prop (no local useState — avoids stale sync bug)
  const isLiked = comment.is_liked ?? false;
  const likesCount = comment.likes_count ?? 0;
  const userReaction = comment.user_reaction ?? null;

  // Top reactions with fallback to user's own reaction to prevent badge flicker during refetch
  let topReactions: Reaction[] = getTopReactions(comment.reactions_summary, 2);
  if (topReactions.length === 0 && likesCount > 0) {
    const fallback = userReaction ? getReaction(userReaction) : null;
    if (fallback) topReactions = [fallback];
  }

  const deleteMutation = useDeleteComment();
  const editMutation = useEditComment();
  const addReplyMutation = useAddComment(
    currentUser ?? { id: "", username: "", full_name: "", avatar_url: null },
  );

  const canDelete =
    !!currentUser &&
    (comment.author_id === currentUser.id || postAuthorId === currentUser.id) &&
    !isPending;

  const canEdit =
    !!currentUser &&
    comment.author_id === currentUser.id &&
    !isPending &&
    Date.now() - new Date(comment.created_at).getTime() < 15 * 60 * 1000;

  const dateLocale = lang === 'ar' ? ar : lang === 'fr' ? fr : enUS;
  const timeAgo = isPending
    ? t('sendingComment')
    : formatDistanceToNow(new Date(comment.created_at), {
        addSuffix: true,
        locale: dateLocale,
      });

  function handleDelete() {
    deleteMutation.mutate({
      commentId: comment.id,
      postId,
      parentCommentId: comment.parent_comment_id,
    });
  }

  function handleEditSubmit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.content) {
      setEditing(false);
      return;
    }
    editMutation.mutate(
      {
        commentId: comment.id,
        postId,
        content: trimmed,
        parentCommentId: comment.parent_comment_id,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed || !currentUser) return;
    const tempId = `temp-${Date.now()}`;
    addReplyMutation.mutate(
      { postId, content: trimmed, tempId, parentCommentId: comment.id },
      {
        onSuccess: () => {
          setReplyText("");
          setShowReply(false);
        },
      },
    );
  }

  const avatarSize = depth === 0 ? "sm" : "xs";

  return (
    <div className={`flex items-start gap-2 ${isPending ? "opacity-60" : ""}`}>
      <UserAvatar
        user={comment.author}
        size={avatarSize}
        userId={comment.author_id}
        className="mt-0.5 shrink-0"
      />

      <div className="min-w-0 flex-1">
        {/* ── Bubble ─────────────────────────────────────────────────── */}
        <div
          className={`relative inline-block max-w-full ${likesCount > 0 ? "mb-3" : "mb-0.5"}`}
        >
          <div className="rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed">
            <span className="flex items-center gap-1">
              <span className="font-semibold leading-tight text-foreground">
                {comment.author.full_name}
              </span>
              {comment.author.is_subscribed && <SubscribedBadge size="xs" />}
            </span>

            {editing ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEditSubmit();
                    }
                    if (e.key === "Escape") {
                      setEditing(false);
                      setEditText(comment.content);
                    }
                  }}
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleEditSubmit}
                  disabled={editMutation.isPending}
                  className="shrink-0 rounded-full p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                  aria-label={t('saveCommentEdit')}
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-foreground/90">{comment.content}</p>
            )}
          </div>

          {/* Reaction badge — top 2 emojis + count, clickable to open who-reacted modal */}
          {likesCount > 0 && (
            <button
              type="button"
              onClick={() => setReactionsModalOpen(true)}
              onPointerEnter={() => {
                preloadReactionsModal();
                prefetchReactors('comment', comment.id);
              }}
              aria-label={t('viewReactionsAriaLabel')}
              className="absolute -bottom-2.5 end-2 flex items-center gap-0.5 rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-xs shadow-sm transition-all hover:scale-105 hover:bg-muted"
            >
              {topReactions.length > 0 ? (
                topReactions.map((r, i) => (
                  <span key={r.type} className={i > 0 ? '-ms-0.5' : ''}>{r.emoji}</span>
                ))
              ) : (
                <span>👍</span>
              )}
              {likesCount > 1 && (
                <span className="font-medium text-muted-foreground">{likesCount}</span>
              )}
            </button>
          )}
        </div>

        {/* ── Action bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-2 text-xs font-semibold text-muted-foreground">
          {/* Like — with hover/long-press reaction picker */}
          <CommentReactionButton
            commentId={comment.id}
            postId={postId}
            parentCommentId={comment.parent_comment_id}
            userReaction={userReaction}
            isLiked={isLiked}
            isAuthenticated={isAuthenticated}
            isPending={isPending}
          />

          {/* Reply button — top-level comments only */}
          {depth === 0 && (
            <AuthGate isAuthenticated={isAuthenticated} action="comment">
              <button
                onClick={() => setShowReply((v) => !v)}
                disabled={isPending}
                className="hover:text-foreground"
              >
                {t('commentReply')}
              </button>
            </AuthGate>
          )}

          <span className="font-normal">{timeAgo}</span>

          {canEdit && !editing && (
            <button
              onClick={() => {
                setEditing(true);
                setEditText(comment.content);
              }}
              className="hover:text-foreground"
            >
              {t('commentEdit')}
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive/80"
            >
              {t('commentDelete')}
            </button>
          )}
        </div>

        {/* ── Reply input ─────────────────────────────────────────────── */}
        {showReply && currentUser && (
          <div className="mt-2 flex items-center gap-2">
            <UserAvatar user={currentUser} size="xs" className="shrink-0" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReplySubmit();
                  }
                  if (e.key === "Escape") setShowReply(false);
                }}
                placeholder={t('writeReplyPlaceholder')}
                maxLength={500}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || addReplyMutation.isPending}
                className="shrink-0 text-primary disabled:opacity-30"
                aria-label={t('sendReply')}
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Nested replies (one level only) ────────────────────────── */}
        {depth === 0 && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 ps-1">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                currentUser={currentUser}
                postAuthorId={postAuthorId}
                isAuthenticated={isAuthenticated}
                depth={1}
                isPending={reply.id.startsWith("temp-")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reactions modal */}
      {reactionsModalOpen && (
        <ReactionsModalLazy
          open={reactionsModalOpen}
          onClose={() => setReactionsModalOpen(false)}
          type="comment"
          entityId={comment.id}
        />
      )}
    </div>
  );
}
