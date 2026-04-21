"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const CommentsDialogLazy = dynamic(
  () => import("@/components/feed/comments-dialog").then((m) => m.CommentsDialog),
  { ssr: false }
);
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLikePost } from "@/hooks/use-like-post";
import type { PostMedia, PostWithAuthor } from "@/lib/validations/post";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("");
}

// ── Lazy video: preload="none" until in viewport ──────────────────────────────

function VideoSlide({
  item,
  className = "",
}: {
  item: PostMedia;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`bg-black ${className}`}>
      <video
        ref={videoRef}
        controls
        playsInline
        poster={item.thumbnail}
        preload={inView ? "metadata" : "none"}
        className="h-full w-full object-contain"
        aria-label="مقطع فيديو"
      >
        {inView && <source src={item.url} />}
        متصفحك لا يدعم تشغيل الفيديو
      </video>
    </div>
  );
}

// ── Single-media display (no carousel) ───────────────────────────────────────

function SingleMedia({
  item,
  priority = false,
}: {
  item: PostMedia;
  priority?: boolean;
}) {
  if (item.type === "video") {
    return (
      <div className="overflow-hidden rounded-xl">
        <VideoSlide item={item} className="aspect-video" />
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
      <Image
        src={item.url}
        alt=""
        fill
        priority={priority}
        className="object-cover"
        sizes="(max-width: 672px) calc(100vw - 32px), 640px"
      />
    </div>
  );
}

// ── Embla carousel (2+ items) ─────────────────────────────────────────────────

function MediaCarousel({
  media,
  priority = false,
}: {
  media: PostMedia[];
  priority?: boolean;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      role="region"
      aria-label="معرض الوسائط"
      aria-roledescription="carousel"
    >
      {/* Slides */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {media.map((item, i) => (
            <div
              key={i}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="شريحة"
              aria-label={`${i + 1} من ${media.length}`}
            >
              {item.type === "video" ? (
                <VideoSlide item={item} className="aspect-square" />
              ) : (
                <div className="relative aspect-square bg-muted">
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    priority={priority && i === 0}
                    className="object-cover"
                    sizes="(max-width: 672px) calc(100vw - 32px), 640px"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slide counter */}
      <div className="pointer-events-none absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {selectedIndex + 1} / {media.length}
      </div>

      {/* Prev — physical left side */}
      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!canScrollPrev}
        aria-label="السابق"
        style={{ left: "8px" }}
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Next — physical right side */}
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        disabled={!canScrollNext}
        aria-label="التالي"
        style={{ right: "8px" }}
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Dot indicators */}
      <div
        className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1"
        role="tablist"
        aria-label="شرائح المعرض"
      >
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`الانتقال إلى الشريحة ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === selectedIndex
                ? "w-4 bg-white"
                : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Content with "show more" ──────────────────────────────────────────────────

const CONTENT_LIMIT = 300;

function PostContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = content.length > CONTENT_LIMIT;
  const displayed =
    needsTruncation && !expanded ? content.slice(0, CONTENT_LIMIT) : content;

  return (
    <p className="text-sm leading-relaxed">
      <span className="whitespace-pre-wrap">{displayed}</span>
      {needsTruncation && !expanded && (
        <>
          {"... "}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="font-medium text-primary hover:underline"
          >
            عرض المزيد
          </button>
        </>
      )}
      {needsTruncation && expanded && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-muted-foreground hover:underline"
          >
            عرض أقل
          </button>
        </>
      )}
    </p>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

export type PostCardProps = {
  post: PostWithAuthor;
  currentUserId?: string;
  currentUser?: CurrentUser;
  onLike?: () => void;
  onDelete?: (postId: string) => void;
  /** Mark first above-the-fold image as priority for LCP */
  priority?: boolean;
};

export function PostCard({
  post,
  currentUserId,
  currentUser,
  onDelete,
  priority = false,
}: PostCardProps) {
  const [bouncing, setBouncing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const likeMutation = useLikePost();

  const liked = post.is_liked ?? false;
  const likesCount = post.likes_count;
  const isOwner = Boolean(currentUserId && currentUserId === post.author_id);
  const isPending = post.is_pending ?? false;

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ar,
  });

  function handleLike() {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 350);
    likeMutation.mutate(post.id);
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط المنشور");
    } catch {
      toast.error("تعذّر نسخ الرابط");
    }
  }

  return (
    <article className={`rounded-xl border bg-card transition-opacity${post.is_pending ? " opacity-50" : ""}`}>
      {/* ── Pending indicator ───────────────────────────────────────── */}
      {post.is_pending && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-muted-foreground">
          <span className="inline-block size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
          جاري النشر...
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <Link
          href={`/profile/${post.author.username}`}
          aria-label={`زيارة ملف ${post.author.full_name}`}
        >
          <Avatar size="lg" className="shrink-0">
            {post.author.avatar_url && (
              <AvatarImage
                src={post.author.avatar_url}
                alt={post.author.full_name}
              />
            )}
            <AvatarFallback>{initials(post.author.full_name)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1">
            <Link
              href={`/profile/${post.author.username}`}
              className="truncate text-sm font-semibold leading-tight hover:underline"
            >
              {post.author.full_name}
            </Link>
            {post.author.is_verified && (
              <BadgeCheck
                className="size-4 shrink-0 fill-green-600 text-white"
                aria-label="موثّق"
              />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Link
              href={`/profile/${post.author.username}`}
              className="hover:underline"
            >
              @{post.author.username}
            </Link>
            {" · "}
            <time dateTime={post.created_at} title={post.created_at}>
              {timeAgo}
            </time>
          </p>
        </div>

        {/* ••• dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="خيارات المنشور"
            className="mt-0.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            <DropdownMenuItem>
              <Bookmark className="size-4" />
              حفظ
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="size-4" />
              إبلاغ
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(post.id)}
                >
                  <Trash2 className="size-4" />
                  حذف
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Text content ────────────────────────────────────────────── */}
      {post.content && (
        <div className="px-4 pt-3">
          <PostContent content={post.content} />
        </div>
      )}

      {/* ── Media ───────────────────────────────────────────────────── */}
      {post.media.length > 0 && (
        <div className={post.content ? "mt-3" : "mt-4"}>
          {post.media.length === 1 ? (
            <SingleMedia item={post.media[0]!} priority={priority} />
          ) : (
            <MediaCarousel media={post.media} priority={priority} />
          )}
        </div>
      )}

      {/* ── Actions bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2">
        {/* Like */}
        <button
          type="button"
          onClick={handleLike}
          disabled={isPending}
          aria-label={liked ? "إلغاء الإعجاب" : "إعجاب"}
          aria-pressed={liked}
          className="flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors hover:bg-red-50 disabled:pointer-events-none dark:hover:bg-red-950"
        >
          <Heart
            className={[
              "size-5 transition-colors duration-150",
              liked ? "fill-red-600 text-red-600" : "text-muted-foreground",
              bouncing ? "animate-[like-bounce_350ms_ease-out]" : "",
            ].join(" ")}
          />
          {likesCount > 0 && (
            <span
              className={`text-xs font-medium ${
                liked ? "text-red-600" : "text-muted-foreground"
              }`}
            >
              {likesCount}
            </span>
          )}
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          disabled={isPending}
          aria-label="تعليق"
          className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:pointer-events-none"
        >
          <MessageCircle className="size-5" />
          {post.comments_count > 0 && (
            <span className="text-xs font-medium">{post.comments_count}</span>
          )}
        </button>

        {/* Share — pushed to the far end */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="مشاركة المنشور"
          className="ms-auto rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {/* ── Comments preview ────────────────────────────────────────── */}
      {post.recent_comments && post.recent_comments.length > 0 && (
        <div className="space-y-2 border-t px-4 pb-4 pt-3">
          {post.recent_comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar size="sm" className="mt-0.5 shrink-0">
                {comment.author.avatar_url && (
                  <AvatarImage
                    src={comment.author.avatar_url}
                    alt={comment.author.full_name}
                  />
                )}
                <AvatarFallback>
                  {initials(comment.author.full_name)}
                </AvatarFallback>
              </Avatar>
              <p className="min-w-0 text-xs leading-relaxed">
                <span className="font-semibold">{comment.author.full_name}</span>
                {" "}
                <span className="text-foreground/90">{comment.content}</span>
              </p>
            </div>
          ))}

          {post.comments_count > post.recent_comments.length && (
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              عرض كل التعليقات ({post.comments_count})
            </button>
          )}
        </div>
      )}

      {/* View-comments link when no preview data but count > 0 */}
      {(!post.recent_comments || post.recent_comments.length === 0) &&
        post.comments_count > 0 && (
          <div className="border-t px-4 pb-3 pt-2.5">
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              عرض {post.comments_count} تعليق
            </button>
          </div>
        )}

      {/* ── Comments dialog (lazy-loaded) ───────────────────────── */}
      {commentsOpen && (
        <CommentsDialogLazy
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          post={post}
          currentUser={currentUser}
        />
      )}
    </article>
  );
}
