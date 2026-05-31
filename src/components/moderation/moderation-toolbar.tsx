"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { commentQueryKey } from "@/hooks/use-comments";
import { useModeration } from "@/hooks/use-moderation";
import {
  moderatorDeletePost,
  moderatorDeleteComment,
  moderatorBanUser,
} from "@/lib/actions/moderation";
import { useLang } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

type Props = {
  targetType: "post" | "comment";
  contentId: string;
  authorId: string;
  /** Required for comments so the comment list can be refreshed after delete. */
  postId?: string;
  /** Current viewer — used to hide the toolbar on the moderator's own content. */
  currentUserId?: string;
  /** Optional callback after a successful delete (e.g. optimistic removal). */
  onDeleted?: () => void;
  className?: string;
};

/**
 * Subtle, distinct moderation quick-actions shown only to admins / moderators
 * holding the matching granular flag. Renders nothing otherwise. Deletions and
 * bans go through the secure SECURITY DEFINER RPCs (see 0052 migration).
 */
export function ModerationToolbar({
  targetType,
  contentId,
  authorId,
  postId,
  currentUserId,
  onDeleted,
  className,
}: Props) {
  const { t } = useLang();
  const caps = useModeration();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"delete" | "ban" | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = targetType === "post" ? caps.canDeletePosts : caps.canDeleteComments;
  const canBan = caps.canBanUsers;

  // Hide on the moderator's own content, and when no action is available.
  const isOwn = !!currentUserId && currentUserId === authorId;
  if (isOwn || (!canDelete && !canBan)) return null;

  function handleDelete() {
    startTransition(async () => {
      const result =
        targetType === "post"
          ? await moderatorDeletePost(contentId)
          : await moderatorDeleteComment(contentId);
      if (!result.success) {
        toast.error(result.error ?? t("moderationActionFailed"));
        return;
      }
      toast.success(t("contentDeleted"));
      setConfirm(null);
      onDeleted?.();
      if (targetType === "comment" && postId) {
        void queryClient.invalidateQueries({ queryKey: commentQueryKey(postId) });
      }
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    });
  }

  function handleBan() {
    startTransition(async () => {
      const result = await moderatorBanUser(authorId);
      if (!result.success) {
        toast.error(result.error ?? t("moderationActionFailed"));
        return;
      }
      toast.success(t("userBanned"));
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    });
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-amber-700 dark:text-amber-400",
          className,
        )}
        role="group"
        aria-label={t("moderationTools")}
      >
        <Shield className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="me-1 text-[11px] font-semibold">{t("moderationTools")}</span>
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
          >
            <Trash2 className="size-3.5" /> {t("deleteContent")}
          </button>
        )}
        {canBan && (
          <button
            type="button"
            onClick={() => setConfirm("ban")}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            <Ban className="size-3.5" /> {t("banUser")}
          </button>
        )}
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "ban" ? t("banUserTitle") : t("deleteContentTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "ban" ? t("banUserDesc") : t("deleteContentDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm === "ban" ? handleBan : handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending
                ? t("deleting")
                : confirm === "ban"
                  ? t("banUser")
                  : t("deleteContent")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
