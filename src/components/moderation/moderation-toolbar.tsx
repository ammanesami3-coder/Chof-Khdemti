"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  getUserRole,
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
 * bans go through the secure SECURITY DEFINER RPCs (see 0052 / 0054 migrations),
 * which strictly forbid a moderator from touching admin-owned targets.
 *
 * As a UX mirror of that server-side rule, the toolbar self-hides when the
 * viewer is a (non-admin) moderator and the target author is an admin.
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

  // A non-admin moderator must never act on admin-owned content. Resolve the
  // target's role lazily (only when it actually matters) and hide accordingly.
  const needsAdminCheck = !caps.isAdmin && (canDelete || canBan);
  const { data: authorRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", authorId],
    queryFn: () => getUserRole(authorId),
    enabled: needsAdminCheck,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Hide on the moderator's own content, and when no action is available.
  const isOwn = !!currentUserId && currentUserId === authorId;
  if (isOwn || (!canDelete && !canBan)) return null;

  // Strict admin protection (UI mirror of the RPC guard): while resolving, or
  // once we know the target is an admin, a non-admin moderator sees nothing.
  if (needsAdminCheck && (roleLoading || authorRole === "admin")) return null;

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
          "flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1 text-slate-600 shadow-sm",
          "dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300",
          className,
        )}
        role="group"
        aria-label={t("moderationTools")}
      >
        <Shield className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <span className="me-1 text-[11px] font-semibold tracking-tight">{t("moderationTools")}</span>
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              "transition-colors duration-150 hover:bg-slate-200/70 hover:text-slate-900",
              "dark:hover:bg-slate-700/70 dark:hover:text-slate-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50",
            )}
          >
            <Trash2 className="size-3.5" /> {t("deleteContent")}
          </button>
        )}
        {canBan && (
          <button
            type="button"
            onClick={() => setConfirm("ban")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-rose-600",
              "transition-colors duration-150 hover:bg-rose-50 hover:text-rose-700",
              "dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40",
            )}
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
