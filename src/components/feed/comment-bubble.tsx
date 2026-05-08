"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Send, Pencil, Trash2, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AuthGate } from "@/components/shared/auth-gate";
import { cn } from "@/lib/utils";
import {
  useDeleteComment,
  useToggleCommentLike,
  useEditComment,
  useAddComment,
} from "@/hooks/use-comments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  highlightId?: string;
};

export function CommentBubble({
  comment,
  postId,
  currentUser,
  postAuthorId,
  isAuthenticated = !!currentUser,
  depth = 0,
  isPending = false,
  highlightId,
}: Props) {
  const elId = `comment-${comment.id}`;
  const isHighlighted = highlightId === comment.id;

  const [isLiked, setIsLiked] = useState(comment.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(comment.likes_count ?? 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [repliesOpen, setRepliesOpen] = useState(isHighlighted);

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

  const replies = comment.replies ?? [];
  const replyCount = replies.length;

  function handleLike() {
    if (!currentUser) return;
    const next = !isLiked;
    setIsLiked(next);
    setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    toggleLikeMutation.mutate(
      { commentId: comment.id, postId, parentCommentId: comment.parent_comment_id },
      {
        onError: () => {
          setIsLiked(!next);
          setLikesCount(comment.likes_count ?? 0);
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
    if (!trimmed || trimmed === comment.content) { setEditing(false); return; }
    editMutation.mutate(
      { commentId: comment.id, postId, content: trimmed, parentCommentId: comment.parent_comment_id },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed || !currentUser) return;
    addReplyMutation.mutate(
      { postId, content: trimmed, tempId: `temp-${Date.now()}`, parentCommentId: comment.id },
      {
        onSuccess: () => {
          setReplyText("");
          setShowReply(false);
          setRepliesOpen(true);
        },
      },
    );
  }

  const avatarSize = depth === 0 ? "sm" : "xs";

  return (
    <div
      id={elId}
      className={cn(
        "flex items-start gap-2.5 scroll-mt-4",
        isPending && "opacity-60",
        depth === 1 && "ps-10",
      )}
    >
      {/* Avatar */}
      <Link href={`/profile/${comment.author.username}`} className="shrink-0 mt-0.5">
        <UserAvatar user={comment.author} size={avatarSize} linkable={false} />
      </Link>

      <div className="min-w-0 flex-1">
        {/* ── Bubble ─────────────────────────────────────────────────────── */}
        <div className={cn("relative inline-block max-w-[85%]", likesCount > 0 && "mb-3")}>
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-relaxed",
              "bg-muted/70 dark:bg-muted/50",
              isHighlighted && "ring-2 ring-primary/40 bg-primary/5 animate-pulse-once",
            )}
          >
            {/* Author name */}
            <Link
              href={`/profile/${comment.author.username}`}
              className="block text-[13px] font-semibold leading-tight text-foreground hover:underline"
            >
              {comment.author.full_name}
            </Link>

            {/* Content / edit input */}
            {editing ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleEditSubmit(); }
                    if (e.key === "Escape") { setEditing(false); setEditText(comment.content); }
                  }}
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleEditSubmit}
                  disabled={editMutation.isPending}
                  className="shrink-0 rounded-full p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                  aria-label="حفظ"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="mt-0.5 text-[13.5px] text-foreground/90 whitespace-pre-wrap">
                {comment.content}
              </p>
            )}
          </div>

          {/* Like badge */}
          {likesCount > 0 && (
            <div className="absolute -bottom-2.5 end-1.5 flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-0.5 shadow-sm">
              <span className="text-[10px] leading-none">❤️</span>
              {likesCount > 1 && (
                <span className="text-[10px] font-semibold leading-none">{likesCount}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="mt-0.5 flex items-center gap-3 px-1">
          {/* Like */}
          <AuthGate isAuthenticated={isAuthenticated} action="like">
            <button
              onClick={handleLike}
              disabled={isPending || toggleLikeMutation.isPending}
              className={cn(
                "text-[12px] font-semibold transition-colors",
                isLiked
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isLiked ? "أعجبني ✓" : "إعجاب"}
            </button>
          </AuthGate>

          {/* Reply — top-level only */}
          {depth === 0 && (
            <AuthGate isAuthenticated={isAuthenticated} action="comment">
              <button
                onClick={() => setShowReply((v) => !v)}
                disabled={isPending}
                className="text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                رد
              </button>
            </AuthGate>
          )}

          {/* Time */}
          <span className="text-[11px] text-muted-foreground/70 font-normal">{timeAgo}</span>

          {/* Overflow menu: edit / delete */}
          {(canEdit || canDelete) && !isPending && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="ms-auto rounded-full p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="خيارات"
              >
                <MoreHorizontal className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-[120px]">
                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => { setEditing(true); setEditText(comment.content); }}
                  >
                    <Pencil className="size-3.5" /> تعديل
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Inline reply composer ───────────────────────────────────────── */}
        {showReply && currentUser && depth === 0 && (
          <div className="mt-2 flex items-center gap-2">
            <UserAvatar user={currentUser} size="xs" className="shrink-0" />
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3 py-1.5">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReplySubmit(); }
                  if (e.key === "Escape") { setShowReply(false); }
                }}
                placeholder={`رد على ${comment.author.full_name}...`}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || addReplyMutation.isPending}
                className="shrink-0 text-primary disabled:opacity-30 transition-opacity"
                aria-label="إرسال الرد"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Replies section ─────────────────────────────────────────────── */}
        {depth === 0 && replyCount > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setRepliesOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              {repliesOpen
                ? <><ChevronUp className="size-3.5" /> إخفاء الردود</>
                : <><ChevronDown className="size-3.5" /> عرض {replyCount} {replyCount === 1 ? "رد" : "ردود"}</>
              }
            </button>

            {repliesOpen && (
              <div className="mt-2 space-y-3">
                {replies.map((reply) => (
                  <CommentBubble
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    currentUser={currentUser}
                    postAuthorId={postAuthorId}
                    isAuthenticated={isAuthenticated}
                    depth={1}
                    isPending={reply.id.startsWith("temp-")}
                    highlightId={highlightId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
