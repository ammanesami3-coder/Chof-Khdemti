"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDeleteComment } from "@/hooks/use-comments";
import type { RecentComment } from "@/lib/validations/post";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("");
}

type Props = {
  comment: RecentComment;
  postId: string;
  currentUserId?: string;
  /** id of the post owner — they may also delete */
  postAuthorId?: string;
  isPending?: boolean;
};

export function CommentItem({
  comment,
  postId,
  currentUserId,
  postAuthorId,
  isPending = false,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const deleteMutation = useDeleteComment();

  const canDelete =
    currentUserId &&
    (comment.author_id === currentUserId || postAuthorId === currentUserId);

  const timeAgo = isPending
    ? "جاري الإرسال..."
    : formatDistanceToNow(new Date(comment.created_at), {
        addSuffix: true,
        locale: ar,
      });

  function handleDeleteClick() {
    if (!confirming) {
      setConfirming(true);
      // Auto-cancel confirm after 3s
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    deleteMutation.mutate({ commentId: comment.id, postId });
  }

  return (
    <div
      className={`group flex gap-2.5 ${isPending ? "opacity-60" : ""}`}
    >
      <Avatar size="sm" className="mt-0.5 shrink-0">
        {comment.author.avatar_url && (
          <AvatarImage
            src={comment.author.avatar_url}
            alt={comment.author.full_name}
          />
        )}
        <AvatarFallback>{initials(comment.author.full_name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{comment.author.full_name}</span>{" "}
          <span className="text-foreground/90">{comment.content}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      {canDelete && !isPending && (
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={deleteMutation.isPending}
          aria-label={confirming ? "تأكيد الحذف" : "حذف التعليق"}
          className={`mt-0.5 shrink-0 rounded-full p-1 transition-all
            opacity-0 group-hover:opacity-100 focus-visible:opacity-100
            ${
              confirming
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
        >
          <Trash2 className="size-3.5" />
          {confirming && (
            <span className="sr-only">اضغط مرة أخرى للتأكيد</span>
          )}
        </button>
      )}
    </div>
  );
}
