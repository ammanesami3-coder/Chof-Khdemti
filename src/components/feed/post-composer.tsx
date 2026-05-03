"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MediaUpload, type MediaItem } from "@/components/shared/media-upload";
import { createPost } from "@/lib/actions/posts";
import type { PostWithAuthor } from "@/lib/validations/post";

const MAX_CONTENT = 2000;

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser;
  onPostCreating?: (tempPost: PostWithAuthor) => void;
  onPostCreated?: (realPost: PostWithAuthor, tempId: string) => void;
  onPostError?: (tempId: string) => void;
  openTrigger?: number;
};

export function PostComposer({
  currentUser,
  onPostCreating,
  onPostCreated,
  onPostError,
  openTrigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fabVisible, setFabVisible] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Open when triggered externally (e.g. BottomNav + button).
  useEffect(() => {
    if (openTrigger) handleOpen();
  }, [openTrigger]);

  // Hide FAB on scroll-down, show on scroll-up
  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      setFabVisible(y < lastY || y < 80);
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDirty = content.trim() !== "" || media.length > 0;
  const canPublish = isDirty && !isUploading && !isPending;

  function reset() {
    setContent("");
    setMedia([]);
    setIsUploading(false);
  }

  function handleClose() {
    if (isPending) return;
    if (isDirty && !window.confirm("هل تريد حذف المسودة؟")) return;
    setOpen(false);
    reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) { handleClose(); return; }
    setOpen(true);
  }

  function handleOpen() {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canPublish) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const savedContent = content.trim();
    const savedMedia = [...media];
    const tempId = `temp-${Date.now()}`;

    // Build optimistic post and emit immediately
    const tempPost: PostWithAuthor = {
      id: tempId,
      content: savedContent || null,
      media: savedMedia,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      author_id: currentUser.id,
      is_liked: false,
      is_pending: true,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        avatar_url: currentUser.avatar_url,
      },
    };

    onPostCreating?.(tempPost);
    setOpen(false);
    reset();

    startTransition(async () => {
      try {
        const { data, error } = await createPost({
          content: savedContent || undefined,
          media: savedMedia,
        });

        if (error) {
          toast.error(error);
          onPostError?.(tempId);
          return;
        }

        toast.success("تم نشر منشورك!");
        if (data) onPostCreated?.(data, tempId);
      } catch {
        toast.error("حدث خطأ أثناء النشر، حاول مجدداً");
        onPostError?.(tempId);
      }
    });
  }

  const initials = currentUser.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="إنشاء منشور جديد"
        className={cn(
          "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
          "bottom-[4.5rem] start-6 sm:bottom-6",
          "transition-all duration-300 hover:bg-primary/90 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          fabVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none",
        )}
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      {/* Composer dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-lg"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0">
                {currentUser.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{currentUser.full_name}</p>
                <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="إغلاق نافذة إنشاء منشور"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto py-1">
            <div className="space-y-1">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
                onKeyDown={handleKeyDown}
                placeholder="ماذا تريد أن تشارك؟"
                rows={4}
                aria-label="محتوى المنشور"
                className="resize-none border-none bg-transparent p-0 text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />
              <p
                className={`text-end text-xs ${
                  content.length >= MAX_CONTENT ? "text-destructive" : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {content.length} / {MAX_CONTENT}
              </p>
            </div>
            <MediaUpload maxFiles={10} onUpload={setMedia} onUploadingChange={setIsUploading} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={!canPublish} className="min-w-24">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  نشر
                  <span className="ms-1.5 hidden text-xs opacity-60 sm:inline">Ctrl+Enter</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
