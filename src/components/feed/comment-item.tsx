"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Send } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AuthGate } from "@/components/shared/auth-gate";
import {
  useDeleteComment,
  useToggleCommentLike,
  useEditComment,
  useAddComment,
} from "@/hooks/use-comments";
import type { RecentComment } from "@/lib/validations/post";

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
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [localIsLiked, setLocalIsLiked] = useState(comment.is_liked ?? false);
  const [localLikesCount, setLocalLikesCount] = useState(comment.likes_count ?? 0);

  const deleteMutation = useDeleteComment();
  const toggleLikeMutation = useToggleCommentLike();
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

  const timeAgo = isPending
    ? "جاري الإرسال..."
    : formatDistanceToNow(new Date(comment.created_at), {
        addSuffix: true,
        locale: ar,
      });

  function handleLike() {
    if (!currentUser) return;
    const newLiked = !localIsLiked;
    setLocalIsLiked(newLiked);
    setLocalLikesCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    toggleLikeMutation.mutate(
      {
        commentId: comment.id,
        postId,
        parentCommentId: comment.parent_comment_id,
      },
      {
        onError: () => {
          setLocalIsLiked(!newLiked);
          setLocalLikesCount(comment.likes_count ?? 0);
        },
      },
    );
  }

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
        className="mt-0.5 shrink-0"
      />

      <div className="min-w-0 flex-1">
        {/* ── Bubble ─────────────────────────────────────────────────── */}
        <div
          className={`relative inline-block max-w-full ${localLikesCount > 0 ? "mb-3" : "mb-0.5"}`}
        >
          <div className="rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed">
            <p className="font-semibold leading-tight text-foreground">
              {comment.author.full_name}
            </p>

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
                  aria-label="حفظ التعديل"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-foreground/90">{comment.content}</p>
            )}
          </div>

          {/* Likes badge — positioned at bubble's bottom-end corner */}
          {localLikesCount > 0 && (
            <div className="absolute -bottom-2.5 end-2 flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-0.5 text-xs shadow-sm">
              <span>❤️</span>
              <span className="font-medium text-foreground">{localLikesCount}</span>
            </div>
          )}
        </div>

        {/* ── Action bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-2 text-xs font-semibold text-muted-foreground">
          <AuthGate isAuthenticated={isAuthenticated} action="like">
            <button
              onClick={handleLike}
              disabled={isPending || toggleLikeMutation.isPending}
              className={
                localIsLiked
                  ? "text-blue-600 hover:text-blue-700"
                  : "hover:text-foreground"
              }
            >
              إعجاب
            </button>
          </AuthGate>

          {/* Reply button — top-level comments only */}
          {depth === 0 && (
            <AuthGate isAuthenticated={isAuthenticated} action="comment">
              <button
                onClick={() => setShowReply((v) => !v)}
                disabled={isPending}
                className="hover:text-foreground"
              >
                رد
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
              تعديل
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive/80"
            >
              حذف
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
                placeholder="اكتب رداً..."
                maxLength={500}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || addReplyMutation.isPending}
                className="shrink-0 text-primary disabled:opacity-30"
                aria-label="إرسال الرد"
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
    </div>
  );
}
