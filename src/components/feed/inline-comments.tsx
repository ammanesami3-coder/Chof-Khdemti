"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { CommentItem } from "@/components/feed/comment-item";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useComments, useAddComment } from "@/hooks/use-comments";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  postId: string;
  postAuthorId: string;
  currentUser?: CurrentUser;
  isAuthenticated: boolean;
  autoFocus?: boolean;
};

export function InlineComments({
  postId,
  postAuthorId,
  currentUser,
  isAuthenticated,
  autoFocus = false,
}: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // For preserving scroll position when loading older comments at top
  const savedScrollHeightRef = useRef(0);
  const initialScrollDone = useRef(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useComments(postId);

  const addMutation = useAddComment(
    currentUser ?? { id: "", username: "", full_name: "", avatar_url: null },
  );

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  // Display oldest-first (newest at bottom, like Facebook)
  const displayComments = [...allComments].reverse();

  // ── Scroll to bottom on first load ────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !initialScrollDone.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      initialScrollDone.current = true;
    }
  }, [isLoading]);

  // ── Preserve scroll position when loading older comments ──────────────────
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    if (isFetchingNextPage) {
      // Save height before new (older) comments are prepended
      savedScrollHeightRef.current = list.scrollHeight;
    } else if (savedScrollHeightRef.current > 0) {
      // After older comments are added above, offset scroll so the view doesn't jump
      const diff = list.scrollHeight - savedScrollHeightRef.current;
      if (diff > 0) list.scrollTop = diff;
      savedScrollHeightRef.current = 0;
    }
  }, [isFetchingNextPage]);

  // ── Auto-focus composer ───────────────────────────────────────────────────
  useEffect(() => {
    if (autoFocus && currentUser) {
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, currentUser]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !currentUser) return;
    setText("");
    addMutation.mutate(
      { postId, content: trimmed, tempId: `temp-${Date.now()}` },
      {
        onSuccess: () => {
          // New comment is at bottom — scroll there
          setTimeout(() => {
            if (listRef.current)
              listRef.current.scrollTop = listRef.current.scrollHeight;
          }, 30);
        },
      },
    );
  }

  return (
    <div className="border-t">
      {/* ── Scrollable comments list ─────────────────────────────────────── */}
      <div
        ref={listRef}
        className="max-h-[220px] overflow-y-auto overscroll-contain px-4 sm:max-h-[300px]"
        aria-label="قائمة التعليقات"
      >
        {/* "View previous" button at the very top */}
        {hasNextPage && (
          <div className="flex justify-start pb-1 pt-2">
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              عرض التعليقات السابقة
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex justify-center py-5">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allComments.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            كن أول من يعلّق!
          </p>
        )}

        {/* Comment items — oldest at top, newest at bottom */}
        <div className="space-y-3 py-2">
          {displayComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
              isAuthenticated={isAuthenticated}
              isPending={comment.id.startsWith("temp-")}
            />
          ))}
        </div>
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="border-t px-4 py-2.5">
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
                placeholder="أضف تعليقاً..."
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                aria-label="كتابة تعليق"
              />
              {text.trim() && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={addMutation.isPending}
                  className="shrink-0 text-primary transition-opacity disabled:opacity-40"
                  aria-label="إرسال التعليق"
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
          <p className="py-1 text-center text-xs text-muted-foreground">
            سجّل دخولك للتعليق
          </p>
        )}
      </div>
    </div>
  );
}
