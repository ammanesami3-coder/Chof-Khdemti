"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useComments, useAddComment, commentQueryKey } from "@/hooks/use-comments";
import { CommentBubble } from "@/components/feed/comment-bubble";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  postId: string;
  postAuthorId: string;
  open: boolean;
  onClose: () => void;
  currentUser?: CurrentUser;
  isAuthenticated?: boolean;
  autoFocus?: boolean;
  highlightCommentId?: string;
};

export function CommentsSheet({
  postId,
  postAuthorId,
  open,
  onClose,
  currentUser,
  isAuthenticated = !!currentUser,
  autoFocus = false,
  highlightCommentId,
}: Props) {
  const { t } = useLang();

  // ── SSR guard ─────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Animation state ───────────────────────────────────────────────────────────
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      clearTimeout(closeTimerRef.current);
      setShouldRender(true);
      // Double rAF: wait for DOM mount before triggering CSS transition
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsVisible(true))
      );
    } else {
      setIsVisible(false);
      closeTimerRef.current = setTimeout(() => setShouldRender(false), 320);
    }
    return () => clearTimeout(closeTimerRef.current);
  }, [open]);

  // ── Clear any drag inline styles when sheet animates ─────────────────────────
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
      sheetRef.current.style.transition = "";
    }
  }, [isVisible]);

  // ── Body scroll lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [shouldRender]);

  // ── Escape key ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Comments data ─────────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useComments(postId);

  const addMutation = useAddComment(
    currentUser ?? { id: "", username: "", full_name: "", avatar_url: null }
  );

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];
  // Oldest first (Facebook-style)
  const displayComments = [...allComments].reverse();

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const savedScrollHeight = useRef(0);

  useEffect(() => {
    if (open) initialScrollDone.current = false;
  }, [open, postId]);

  // ── Scroll to bottom on first load ────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !initialScrollDone.current && listRef.current && isVisible) {
      if (!highlightCommentId) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
      initialScrollDone.current = true;
    }
  }, [isLoading, isVisible, highlightCommentId]);

  // ── Preserve scroll when loading older comments ───────────────────────────────
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (isFetchingNextPage) {
      savedScrollHeight.current = list.scrollHeight;
    } else if (savedScrollHeight.current > 0) {
      const diff = list.scrollHeight - savedScrollHeight.current;
      if (diff > 0) list.scrollTop = diff;
      savedScrollHeight.current = 0;
    }
  }, [isFetchingNextPage]);

  // ── Scroll to highlighted comment ─────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible || !highlightCommentId || isLoading) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`comment-${highlightCommentId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 420);
    return () => clearTimeout(t);
  }, [isVisible, highlightCommentId, isLoading]);

  // ── Realtime subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-rt-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          if ((payload.new as { author_id: string }).author_id !== currentUser?.id) {
            void queryClient.invalidateQueries({ queryKey: commentQueryKey(postId) });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, postId, currentUser?.id, queryClient]);

  // ── Auto-focus ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isVisible && autoFocus && currentUser) {
      const t = setTimeout(() => inputRef.current?.focus(), 420);
      return () => clearTimeout(t);
    }
  }, [isVisible, autoFocus, currentUser]);

  // ── Drag-to-dismiss (handle bar only, mobile only) ────────────────────────────
  const touchStartY = useRef(0);
  const isMobileRef = useRef(false);

  useEffect(() => {
    const check = () => { isMobileRef.current = window.innerWidth < 640; };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function onHandleTouchStart(e: React.TouchEvent) {
    if (!isMobileRef.current || !sheetRef.current) return;
    touchStartY.current = e.touches[0]!.clientY;
    sheetRef.current.style.transition = "none";
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isMobileRef.current || !sheetRef.current) return;
    const delta = e.touches[0]!.clientY - touchStartY.current;
    if (delta > 0) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }

  function onHandleTouchEnd(e: React.TouchEvent) {
    if (!isMobileRef.current || !sheetRef.current) return;
    const delta = e.changedTouches[0]!.clientY - touchStartY.current;
    sheetRef.current.style.transition = "transform 0.3s ease-out";
    if (delta > 120) {
      sheetRef.current.style.transform = "translateY(100%)";
      setTimeout(onClose, 300);
    } else {
      sheetRef.current.style.transform = "translateY(0)";
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !currentUser) return;
    setText("");
    addMutation.mutate(
      { postId, content: trimmed, tempId: `temp-${Date.now()}` },
      {
        onSuccess: () => {
          setTimeout(() => {
            if (listRef.current)
              listRef.current.scrollTop = listRef.current.scrollHeight;
          }, 50);
        },
      }
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div dir="rtl">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-50 bg-black/50",
          "transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('commentsHeader')}
        className={cn(
          // Mobile: full-width bottom sheet
          "fixed bottom-0 inset-x-0 z-50 flex flex-col",
          "bg-background rounded-t-2xl shadow-2xl",
          "max-h-[90dvh]",
          // Desktop: center-aligned narrow sheet (still slides from bottom)
          "sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] sm:rounded-2xl sm:bottom-4",
          // Slide animation
          "transition-transform duration-300 ease-out will-change-transform",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag handle (mobile only) */}
        <div
          className="flex justify-center pt-3 pb-1 sm:hidden touch-none cursor-grab active:cursor-grabbing select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          aria-hidden
        >
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0">
          <h2 className="text-sm font-semibold">{t('commentsHeader')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label={t('closeLabel')}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable comment list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          aria-label={t('commentsHeader')}
        >
          {/* Load older comments */}
          {hasNextPage && (
            <div className="flex justify-center px-4 pt-4 pb-1">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {isFetchingNextPage && <Loader2 className="size-3 animate-spin" />}
                {t('loadOlderComments')}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && displayComments.length === 0 && (
            <div className="flex flex-col items-center py-16">
              <p className="text-sm text-muted-foreground">{t('beFirstToComment')}</p>
            </div>
          )}

          <div className="space-y-3 px-3 py-3">
            {displayComments.map((comment) => (
              <CommentBubble
                key={comment.id}
                comment={comment}
                postId={postId}
                currentUser={currentUser}
                postAuthorId={postAuthorId}
                isAuthenticated={isAuthenticated}
                isPending={comment.id.startsWith("temp-")}
                highlightId={highlightCommentId}
              />
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t px-4 py-3 bg-background">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <UserAvatar user={currentUser} size="sm" className="shrink-0" />
              <div className="flex flex-1 items-center gap-2 rounded-full bg-muted px-3 py-2">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={t('addCommentPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  aria-label={t('writeCommentAriaLabel')}
                />
                {text.trim() && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={addMutation.isPending}
                    className="shrink-0 transition-opacity disabled:opacity-40"
                    style={{ color: 'var(--brand-accent)' }}
                    aria-label={t('sendCommentAriaLabel')}
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="py-1 text-center text-sm text-muted-foreground">
              {t('loginToComment')}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
