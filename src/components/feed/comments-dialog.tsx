"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CommentItem } from "@/components/feed/comment-item";
import { useComments, useAddComment } from "@/hooks/use-comments";
import type { PostWithAuthor } from "@/lib/validations/post";

const MAX_CONTENT = 500;

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: PostWithAuthor;
  currentUser?: CurrentUser;
};

export function CommentsDialog({ open, onOpenChange, post, currentUser }: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useComments(post.id);

  const addMutation = useAddComment(
    currentUser ?? { id: "", username: "", full_name: "", avatar_url: null }
  );

  // Infinite scroll inside the dialog
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: scrollRef.current, rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !currentUser) return;
    const tempId = `temp-${Date.now()}`;
    addMutation.mutate(
      { postId: post.id, content: trimmed, tempId },
      {
        onSuccess: () => {
          setText("");
          // Scroll to top (newest first)
          scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const postSnippet = post.content
    ? post.content.slice(0, 80) + (post.content.length > 80 ? "..." : "")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm">
            التعليقات
            {post.comments_count > 0 && (
              <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                ({post.comments_count})
              </span>
            )}
          </DialogTitle>
          {postSnippet && (
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium">{post.author.full_name}:</span>{" "}
              {postSnippet}
            </p>
          )}
        </DialogHeader>

        {/* ── Comments list ────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          aria-label="قائمة التعليقات"
        >
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && allComments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              كن أول من يعلّق!
            </p>
          )}

          <div className="space-y-4">
            {allComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={post.id}
                currentUserId={currentUser?.id}
                postAuthorId={post.author_id}
                isPending={comment.id.startsWith("temp-")}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} />

          {isFetchingNextPage && (
            <div className="flex justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* ── Composer ─────────────────────────────────────────────── */}
        {currentUser && (
          <div className="border-t px-4 py-3">
            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CONTENT))}
                onKeyDown={handleKeyDown}
                placeholder="أضف تعليقاً..."
                rows={2}
                className="min-h-0 resize-none text-sm"
                aria-label="كتابة تعليق"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!text.trim() || addMutation.isPending}
                aria-label="إرسال التعليق"
                className="shrink-0 self-end"
              >
                {addMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            {text.length > MAX_CONTENT * 0.8 && (
              <p
                className={`mt-1 text-end text-xs ${
                  text.length >= MAX_CONTENT
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {text.length} / {MAX_CONTENT}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
