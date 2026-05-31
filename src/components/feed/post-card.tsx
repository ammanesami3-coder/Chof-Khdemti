"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import useEmblaCarousel from "embla-carousel-react";
import { formatDistanceToNow } from "date-fns";
import { ar, fr, enUS } from "date-fns/locale";

const CommentsSheetLazy = dynamic(
  () => import("@/components/feed/comments-sheet").then((m) => m.CommentsSheet),
  { ssr: false }
);
const OptimizedVideoLazy = dynamic(
  () => import("@/components/feed/optimized-video").then((m) => m.OptimizedVideo),
  { ssr: false }
);
const MediaLightboxLazy = dynamic(
  () => import("@/components/shared/media-lightbox").then((m) => m.MediaLightbox),
  { ssr: false }
);
const ShareSheetLazy = dynamic(
  () => import("@/components/feed/share-sheet").then((m) => m.ShareSheet),
  { ssr: false }
);
const SharedPostEmbedLazy = dynamic(
  () => import("@/components/feed/shared-post-embed").then((m) => m.SharedPostEmbed),
  { ssr: false, loading: () => <div className="mx-4 mt-3 h-20 animate-pulse rounded-xl bg-muted" /> }
);
import { ReactionsModalLazy, preloadReactionsModal } from "@/components/feed/reactions-modal-lazy";
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share2,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostReactionButton } from "@/components/feed/post-reaction-button";
import { ReactionsSummary } from "@/components/feed/reactions-summary";
import { usePrefetchReactors } from "@/hooks/use-reactors";
import { followUser, unfollowUser } from "@/lib/actions/follow";
import { followStore } from "@/lib/stores/follow-store";
import { toggleSavePost } from "@/lib/actions/save-post";
import { ReportDialog } from "@/components/feed/report-dialog";
import { ModerationToolbar } from "@/components/moderation/moderation-toolbar";
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
import { AuthGate } from "@/components/shared/auth-gate";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StatusAwareAvatar } from "@/components/shared/status-aware-avatar";
import { SubscribedBadge } from "@/components/shared/subscribed-badge";
import { OfficialBadge } from "@/components/shared/official-badge";
import { isOfficialAccount } from "@/lib/constants/official";
import { useLang } from "@/lib/i18n/language-context";
import type { PostMedia, PostWithAuthor } from "@/lib/validations/post";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

// ── Single-media display (no carousel) ───────────────────────────────────────

function SingleMedia({
  item,
  priority = false,
  onImageClick,
}: {
  item: PostMedia;
  priority?: boolean;
  onImageClick?: () => void;
}) {
  const { t } = useLang();

  if (item.type === "video") {
    // OptimizedVideo handles its own rounded corners + smart aspect ratio
    return <OptimizedVideoLazy item={item} autoAspect />;
  }

  // Image: render at natural proportions, center-crop portrait images at max-height.
  // Using flex+items-center on the wrapper so the crop is symmetric (center of image visible).
  return (
    <button
      type="button"
      onClick={onImageClick}
      className="block w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t('viewFullImageAriaLabel')}
    >
      <div className="flex max-h-[600px] items-center overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cloudinaryLoader({ src: item.url, width: 1280 })}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </button>
  );
}

// ── Embla carousel (2+ items) ─────────────────────────────────────────────────

function MediaCarousel({
  media,
  onImageClick,
}: {
  media: PostMedia[];
  onImageClick?: (imageIndex: number) => void;
}) {
  const { t } = useLang();
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
      aria-label={t('mediaGalleryAriaLabel')}
      aria-roledescription="carousel"
    >
      {/* Slides — forced LTR so Embla's scroll math matches the flex layout.
          In an RTL document the flex strip flows right-to-left while Embla
          defaults to ltr, so every slide past the first lands off-screen. */}
      <div ref={emblaRef} className="overflow-hidden" dir="ltr">
        <div className="flex">
          {media.map((item, i) => (
            <div
              key={i}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription={t('slideRoleDesc')}
              aria-label={`${i + 1} ${t('slideNofMPrefix')} ${media.length}`}
            >
              {item.type === "video" ? (
                // Carousel videos: use a taller-than-square container with object-contain
                <div className="aspect-[4/5] bg-black">
                  <OptimizedVideoLazy item={item} className="h-full w-full" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    let imgIdx = 0;
                    for (let j = 0; j < i; j++) {
                      if (media[j]?.type === "image") imgIdx++;
                    }
                    onImageClick?.(imgIdx);
                  }}
                  className="block w-full cursor-zoom-in overflow-hidden bg-muted focus-visible:outline-none"
                  aria-label={t('viewFullImageAriaLabel')}
                >
                  {/* aspect-[4/5]: taller than square, crops less of portrait images
                      while still keeping landscape images looking great. */}
                  <div className="aspect-[4/5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinaryLoader({ src: item.url, width: 1280 })}
                      alt=""
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
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
        aria-label={t('prevSlide')}
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
        aria-label={t('nextSlide')}
        style={{ right: "8px" }}
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white transition-opacity hover:bg-black/80 disabled:pointer-events-none disabled:opacity-0"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Dot indicators */}
      <div
        className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1"
        role="tablist"
        aria-label={t('galleryDotsAriaLabel')}
      >
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`${t('goToSlidePrefix')} ${i + 1}`}
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
  const { t } = useLang();
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
            {t('showMore')}
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
            {t('showLess')}
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
  /** Comment ID to highlight + auto-open the comments sheet */
  initialCommentHighlight?: string;
};

export function PostCard({
  post,
  currentUserId,
  currentUser,
  onDelete,
  priority = false,
  initialCommentHighlight,
}: PostCardProps) {
  const { t, lang } = useLang();
  const prefetchReactors = usePrefetchReactors();
  const [sheetOpen, setSheetOpen] = useState(!!initialCommentHighlight);
  const [sheetAutoFocus, setSheetAutoFocus] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  // Save state
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false);
  const [isSavePending, startSaveTransition] = useTransition();
  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);
  // Module-level store — syncs follow state across ALL PostCards globally
  const followMap = useSyncExternalStore(
    followStore.subscribe,
    followStore.getSnapshot,
    followStore.getServerSnapshot,
  );
  const isFollowing = followMap.has(post.author_id)
    ? (followMap.get(post.author_id) as boolean)
    : (post.is_following ?? false);
  const lightboxImages = post.media
    .filter((m) => m.type === "image")
    .map((m) => ({ src: m.url }));

  const isOwner = Boolean(currentUserId && currentUserId === post.author_id);
  const isPending = post.is_pending ?? false;

  const dateLocale = lang === 'ar' ? ar : lang === 'fr' ? fr : enUS;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: dateLocale,
  });

  function handleShare() {
    setShareOpen(true);
  }

  async function handleFollowToggle() {
    if (!currentUserId || isFollowPending) return;
    const prev = isFollowing;
    // Optimistic update via module-level store — instantly syncs all PostCards globally
    followStore.setFollowing(post.author_id, !prev);
    setIsFollowPending(true);
    try {
      const result = prev
        ? await unfollowUser(post.author_id)
        : await followUser(post.author_id);
      if (result?.error) {
        followStore.setFollowing(post.author_id, prev); // rollback
        toast.error(result.error);
      }
    } catch {
      followStore.setFollowing(post.author_id, prev); // rollback
      toast.error(t('operationFailed'));
    } finally {
      setIsFollowPending(false);
    }
  }

  function handleSaveToggle() {
    if (isSavePending) return;
    const prev = isSaved;
    setIsSaved(!prev);
    startSaveTransition(async () => {
      const result = await toggleSavePost(post.id);
      if (result.error) {
        setIsSaved(prev);
        toast.error(result.error);
      } else {
        setIsSaved(result.saved);
        toast.success(result.saved ? t('postSaved') : t('postUnsaved'));
      }
    });
  }

  function handleDeleteConfirmed() {
    startDeleteTransition(async () => {
      onDelete?.(post.id);
      setDeleteOpen(false);
    });
  }

  return (
    <article className={`rounded-xl border bg-card transition-opacity${post.is_pending ? " opacity-50" : ""}`}>
      {/* ── Repost indicator ────────────────────────────────────────── */}
      {post.shared_post_id && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0 text-xs text-muted-foreground">
          <Repeat2 className="size-3.5 shrink-0" />
          <span>
            <Link href={`/profile/${post.author.username}`} className="font-medium hover:underline">
              {post.author.full_name}
            </Link>
            {" "}{t('sharedAPost')}
          </span>
        </div>
      )}

      {/* ── Pending indicator ───────────────────────────────────────── */}
      {post.is_pending && (
        <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-muted-foreground">
          <span className="inline-block size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
          {t('postPending')}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <StatusAwareAvatar user={post.author} size="md" currentUserId={currentUserId} />

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={`/profile/${post.author.username}`}
              className="truncate text-sm font-semibold leading-tight hover:underline"
            >
              {post.author.full_name}
            </Link>
            {isOfficialAccount(post.author) ? (
              // Official platform account: show only the distinct official seal.
              <OfficialBadge size="xs" />
            ) : (
              <>
                {post.author.is_verified && (
                  <BadgeCheck
                    className="size-4 shrink-0 fill-green-600 text-white"
                    aria-label={t('verifiedBadgeAriaLabel')}
                  />
                )}
                {post.author.is_subscribed && <SubscribedBadge size="xs" />}
              </>
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
            <time dateTime={post.created_at} title={post.created_at} suppressHydrationWarning>
              {timeAgo}
            </time>
          </p>
        </div>

        {/* Follow/Unfollow — shown only on others' posts when follow state is known */}
        {currentUserId && !isOwner && post.is_following !== undefined && (
          <button
            type="button"
            onClick={() => void handleFollowToggle()}
            disabled={isFollowPending}
            aria-label={isFollowing ? t('unfollow') : t('follow')}
            className="shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50
              hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isFollowing ? (
              <UserCheck className="size-3.5 text-primary" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            <span className={isFollowing ? 'text-primary' : 'text-muted-foreground'}>
              {isFollowing ? t('following_verb') : t('follow')}
            </span>
          </button>
        )}

        {/* ••• dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id={`post-menu-${post.id}`}
            aria-label={t('postOptions')}
            className="mt-0.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            {/* Save / Unsave */}
            {currentUserId && (
              <DropdownMenuItem onClick={handleSaveToggle} disabled={isSavePending}>
                {isSaved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
                {isSaved ? t('unsavePost') : t('savePost')}
              </DropdownMenuItem>
            )}
            {/* Report — only for others' posts */}
            {currentUserId && !isOwner && (
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="size-4" />
                {t('reportPost')}
              </DropdownMenuItem>
            )}
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  {t('deletePost')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Moderation quick-actions (admins / moderators only) ──────── */}
      <ModerationToolbar
        targetType="post"
        contentId={post.id}
        authorId={post.author_id}
        currentUserId={currentUserId}
        className="mx-4 mt-2"
      />

      {/* ── Text content ────────────────────────────────────────────── */}
      {post.content && (
        <div className="px-4 pt-3">
          <PostContent content={post.content} />
        </div>
      )}

      {/* ── Shared post embed (repost) ──────────────────────────────── */}
      {post.shared_post && (
        <div className="px-4 pt-3">
          <SharedPostEmbedLazy post={post.shared_post} />
        </div>
      )}

      {/* ── Media ───────────────────────────────────────────────────── */}
      {post.media.length > 0 && (
        <div className={post.content ? "mt-3" : "mt-4"}>
          {post.media.length === 1 ? (
            <SingleMedia
              item={post.media[0]!}
              priority={priority}
              onImageClick={
                post.media[0]?.type === "image"
                  ? () => { setLightboxIndex(0); setLightboxOpen(true); }
                  : undefined
              }
            />
          ) : (
            <MediaCarousel
              media={post.media}
              onImageClick={(idx) => { setLightboxIndex(idx); setLightboxOpen(true); }}
            />
          )}
        </div>
      )}

      {/* ── Actions bar ─────────────────────────────────────────────── */}
      {/* Actions bar — justify-between keeps reactions summary reliably at the
           far end regardless of RTL/LTR direction switch. */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* ── Start group: Like / Comment / Share ── */}
        <div className="flex items-center gap-0.5">
          {/* Like / Reactions */}
          <AuthGate isAuthenticated={!!currentUserId} action="like">
            <PostReactionButton
              postId={post.id}
              likesCount={post.likes_count}
              userReaction={post.user_reaction}
            />
          </AuthGate>

          {/* Comment */}
          <AuthGate isAuthenticated={!!currentUserId} action="comment">
            <button
              type="button"
              onClick={() => {
                setSheetAutoFocus(true);
                setSheetOpen(true);
              }}
              disabled={isPending}
              aria-label={t('commentAriaLabel')}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none"
            >
              <MessageCircle className="size-5" strokeWidth={1.75} />
              {post.comments_count > 0 && (
                <span className="tabular-nums">{post.comments_count}</span>
              )}
            </button>
          </AuthGate>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label={t('sharePostAriaLabel')}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Share2 className="size-5" strokeWidth={1.75} />
            {(post.shares_count ?? 0) > 0 && (
              <span className="tabular-nums">{post.shares_count}</span>
            )}
          </button>
        </div>

        {/* ── End: aggregated reactions summary ── */}
        {post.likes_count > 0 && (
          <ReactionsSummary
            summary={post.reactions_summary}
            totalCount={post.likes_count}
            fallbackReaction={post.user_reaction}
            onClick={() => setReactionsModalOpen(true)}
            onPrefetch={() => {
              preloadReactionsModal();
              prefetchReactors('post', post.id);
            }}
          />
        )}
      </div>

      {/* ── Comments preview ────────────────────────────────────────── */}
      {post.recent_comments && post.recent_comments.length > 0 && (
        <div className="space-y-2 border-t px-4 pb-3 pt-3">
          {post.recent_comments.slice(0, 2).map((comment) => (
            <button
              key={comment.id}
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex w-full items-start gap-2 text-start"
            >
              <UserAvatar user={comment.author} size="xs" className="mt-0.5 shrink-0" linkable={false} />
              <div className="inline-block max-w-[calc(100%-2.5rem)] rounded-2xl bg-muted px-3 py-1.5 text-xs leading-relaxed">
                <span className="font-semibold text-foreground">
                  {comment.author.full_name}
                </span>{" "}
                <span className="text-foreground/80">{comment.content}</span>
              </div>
            </button>
          ))}

          {post.comments_count > 2 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {t('viewAllComments')} ({post.comments_count - 2})
            </button>
          )}
        </div>
      )}

      {/* View-comments link when no preview but count > 0 */}
      {(!post.recent_comments || post.recent_comments.length === 0) &&
        post.comments_count > 0 && (
          <div className="border-t px-4 pb-3 pt-2.5">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {t('viewAllComments')} ({post.comments_count})
            </button>
          </div>
        )}

      {/* ── Comments sheet (bottom sheet overlay) ───────────────── */}
      <CommentsSheetLazy
        postId={post.id}
        postAuthorId={post.author_id}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSheetAutoFocus(false); }}
        currentUser={currentUser}
        isAuthenticated={!!currentUserId}
        autoFocus={sheetAutoFocus}
        highlightCommentId={initialCommentHighlight}
      />

      {/* ── Media Lightbox ───────────────────────────────────────── */}
      {lightboxImages.length > 0 && (
        <MediaLightboxLazy
          images={lightboxImages}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* ── Share Sheet ──────────────────────────────────────────── */}
      <ShareSheetLazy
        post={post}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        isAuthenticated={!!currentUserId}
      />

      {/* ── Reactions modal (chunk loaded on first open) ──────────── */}
      {reactionsModalOpen && (
        <ReactionsModalLazy
          open={reactionsModalOpen}
          onClose={() => setReactionsModalOpen(false)}
          type="post"
          entityId={post.id}
        />
      )}

      {/* ── Delete confirmation ───────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePostTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deletePostDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Report dialog ─────────────────────────────────────────── */}
      <ReportDialog
        targetType="post"
        targetId={post.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  );
}
