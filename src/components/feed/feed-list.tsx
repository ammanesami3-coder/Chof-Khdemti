"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUp, Compass, Image, Loader2, RefreshCw, VideoOff } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { PostCardSkeletonList } from "@/components/feed/post-card-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { AdSlot } from "@/components/shared/ad-slot";
import {
  fetchFollowingFeed,
  fetchDiscoverFeed,
  fetchUserPosts,
  fetchSmartFeed,
  fetchVideoFeed,
  fetchOfficialPosts,
} from "@/lib/queries/posts";
import { useLang } from "@/lib/i18n/language-context";
import type { FeedCursor, FeedPage } from "@/lib/queries/posts";
import type { PostWithAuthor } from "@/lib/validations/post";

export type FeedType = "following" | "discover" | "user" | "smart" | "videos";

// Inject a native ad after every Nth post in the main social feed.
const AD_INTERVAL = 6;
const FEED_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT ?? "";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  feedType: FeedType;
  currentUserId?: string;
  currentUser?: CurrentUser;
  profileUserId?: string;
  ownerName?: string;
  isOwnProfile?: boolean;
  initialData?: FeedPage;
  newPosts?: PostWithAuthor[];
};

const PAGE_SIZE = 20;
// Minimum time away before showing "new posts" banner (30 seconds)
const STALE_AWAY_MS = 30_000;

export function FeedList({
  feedType,
  currentUserId,
  currentUser,
  profileUserId,
  ownerName,
  isOwnProfile,
  initialData,
  newPosts = [],
}: Props) {
  const { t } = useLang();
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const seenTopIdRef = useRef<string | null>(null);

  const [newPostsBanner, setNewPostsBanner] = useState(0);

  // ── Pull-to-refresh state ─────────────────────────────────────────────────
  const touchStartY = useRef(0);
  const [pullDelta, setPullDelta] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const PULL_THRESHOLD = 64;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useInfiniteQuery<
    FeedPage,
    Error,
    { pages: FeedPage[]; pageParams: (FeedCursor | undefined)[] },
    string[],
    FeedCursor | undefined
  >({
    queryKey: ["feed", feedType, currentUserId ?? "anon", profileUserId ?? ""],
    queryFn: async ({ pageParam }) => {
      if (feedType === "smart")
        return fetchSmartFeed(currentUserId, pageParam);
      if (feedType === "following" && currentUserId)
        return fetchFollowingFeed(currentUserId, pageParam);
      if (feedType === "discover")
        return fetchDiscoverFeed(currentUserId, pageParam);
      if (feedType === "user" && profileUserId)
        return fetchUserPosts(profileUserId, currentUserId, pageParam);
      if (feedType === "videos")
        return fetchVideoFeed(currentUserId, pageParam);
      return { posts: [], nextCursor: null };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 60_000,
    gcTime: 300_000,
    ...(initialData
      ? { initialData: { pages: [initialData], pageParams: [undefined] } }
      : {}),
  });

  // ── Pinned official-account posts ─────────────────────────────────────────
  // Platform announcements are injected at the top of the main social feeds
  // for ALL users, bypassing the follow/subscription filters. Skipped on
  // single-profile and video-only feeds.
  const pinsOfficial =
    feedType === "smart" || feedType === "following" || feedType === "discover";

  const { data: officialPosts = [] } = useQuery<PostWithAuthor[]>({
    queryKey: ["official-pinned", currentUserId ?? "anon"],
    queryFn: () => fetchOfficialPosts(currentUserId),
    enabled: pinsOfficial,
    staleTime: 300_000,
    gcTime: 600_000,
  });

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage)
          void fetchNextPage();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── New-posts banner via visibilitychange ─────────────────────────────────
  useEffect(() => {
    if (feedType === "user") return;

    function onHide() {
      if (document.hidden) hiddenAtRef.current = Date.now();
    }

    async function onShow() {
      if (document.hidden) return;
      const hiddenAt = hiddenAtRef.current;
      if (!hiddenAt || Date.now() - hiddenAt < STALE_AWAY_MS) return;
      hiddenAtRef.current = null;

      const result = await refetch({ cancelRefetch: false });
      const latestFirst = result.data?.pages[0]?.posts[0];
      if (latestFirst && seenTopIdRef.current && latestFirst.id !== seenTopIdRef.current) {
        const seen = seenTopIdRef.current;
        const newCount = result.data?.pages[0]?.posts.filter(
          (p) => p.created_at > (seen ?? "")
        ).length ?? 1;
        setNewPostsBanner(newCount);
      }
    }

    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [feedType, refetch]);

  // Track the top post ID seen
  useEffect(() => {
    const topId = data?.pages[0]?.posts[0]?.id;
    if (topId && !seenTopIdRef.current) seenTopIdRef.current = topId;
  }, [data]);

  function dismissBanner() {
    const topId = data?.pages[0]?.posts[0]?.id;
    if (topId) seenTopIdRef.current = topId;
    setNewPostsBanner(0);
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Pull-to-refresh touch handlers ───────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    touchStartY.current = e.touches[0]?.clientY ?? 0;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStartY.current) return;
    const delta = (e.touches[0]?.clientY ?? 0) - touchStartY.current;
    if (delta > 0) setPullDelta(Math.min(delta, PULL_THRESHOLD * 1.5));
  }

  async function onTouchEnd() {
    if (pullDelta >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      await refetch();
      setNewPostsBanner(0);
      const topId = data?.pages[0]?.posts[0]?.id;
      if (topId) seenTopIdRef.current = topId;
      setIsRefreshing(false);
    }
    touchStartY.current = 0;
    setPullDelta(0);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) return <PostCardSkeletonList count={5} />;

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">{t('feedLoadError')}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const fetchedPosts = data?.pages.flatMap((p) => p.posts) ?? [];
  // Pinned official posts go first; dedupe them out of the regular stream so
  // they never appear twice (they also surface chronologically in discover).
  const pinned = pinsOfficial ? officialPosts : [];
  const officialIds = new Set(pinned.map((p) => p.id));
  const fetchedIds = new Set(fetchedPosts.map((p) => p.id));
  const uniqueNew = newPosts.filter(
    (p) => !fetchedIds.has(p.id) && !officialIds.has(p.id)
  );
  const rest = [...uniqueNew, ...fetchedPosts].filter((p) => !officialIds.has(p.id));
  const displayed = [...pinned, ...rest];

  // ── Empty states ──────────────────────────────────────────────────────────
  if (!displayed.length) {
    if (feedType === "smart" || feedType === "following") {
      return (
        <EmptyState
          icon={Compass}
          title={t('feedFollowingEmpty')}
          description={t('feedFollowingDesc')}
          action={{ label: t('discoverArtisans'), href: "/explore" }}
        />
      );
    }
    if (feedType === "user") {
      const label = ownerName ? `${ownerName} — ${t('hasNotPostedYet')}` : t('hasNotPostedYet');
      return (
        <EmptyState
          icon={Image}
          title={label}
          description={isOwnProfile ? t('shareFirstWork') : undefined}
          action={isOwnProfile ? { label: t('createFirstPost'), href: "/" } : undefined}
        />
      );
    }
    if (feedType === "videos") {
      return (
        <EmptyState
          icon={VideoOff}
          title="لا توجد فيديوهات بعد"
          description="لم يشارك الحرفيون أي فيديوهات حتى الآن"
        />
      );
    }
    return (
      <EmptyState
        icon={Compass}
        title={t('feedFollowingEmpty')}
        description={t('noPostsInSection')}
      />
    );
  }

  return (
    <div
      ref={listRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDelta > 20 || isRefreshing) && (
        <div
          className="flex items-center justify-center py-3 text-muted-foreground transition-all"
          style={{ height: isRefreshing ? 48 : Math.min(pullDelta * 0.75, 48) }}
          aria-live="polite"
          aria-label={isRefreshing ? t('refreshing') : t('pullToRefresh')}
        >
          {isRefreshing || isFetching ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw
              className="size-5 transition-transform"
              style={{ transform: `rotate(${(pullDelta / PULL_THRESHOLD) * 180}deg)` }}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* New posts banner */}
      {newPostsBanner > 0 && (
        <button
          type="button"
          onClick={dismissBanner}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-transform hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`${newPostsBanner} ${t('newPostsAvailable')}`}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
          {newPostsBanner} {t('newPostsAvailable')}
        </button>
      )}

      <div className="space-y-4">
        {displayed.map((post, i) => {
          // Show ads only in the main social feeds, after every Nth post,
          // but never trailing as the final item.
          const showAd =
            feedType !== "user" &&
            feedType !== "videos" &&
            (i + 1) % AD_INTERVAL === 0 &&
            i < displayed.length - 1;

          return (
            <Fragment key={post.id}>
              <PostCard
                post={post}
                currentUserId={currentUserId}
                currentUser={currentUser}
                priority={i === 0}
              />
              {showAd && <AdSlot slot={FEED_AD_SLOT} />}
            </Fragment>
          );
        })}
      </div>

      <div ref={sentinelRef} />

      {isFetchingNextPage && <PostCardSkeletonList count={3} />}

      {!hasNextPage && fetchedPosts.length >= PAGE_SIZE && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {t('endOfFeed')}
        </p>
      )}
    </div>
  );
}
