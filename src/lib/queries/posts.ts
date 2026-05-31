'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveOfficialAccountId } from '@/lib/official/account';
import { OFFICIAL_PINNED_LIMIT } from '@/lib/constants/official';
import type { PostMedia, PostWithAuthor, SharedPostData } from '@/lib/validations/post';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedCursor = {
  created_at: string;
  id: string;
  /** Tracks which phase the smart feed is in (ignored by other feed types) */
  phase?: 'following' | 'discover';
};

export type FeedPage = {
  posts: PostWithAuthor[];
  nextCursor: FeedCursor | null;
};

// ── Internals ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type RawPost = {
  id: string;
  content: string | null;
  media: unknown;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  created_at: string;
  author_id: string;
  shared_post_id?: string | null;
  reactions_summary?: Record<string, number> | null;
};

function cursorFilter(cursor: FeedCursor) {
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// `posts` has columns added in later migrations (shares_count 0021, has_video
// 0041, reactions_summary 0044) that aren't in the generated types yet. Route
// post selects through this cast so POST_SELECT can request them in one query.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function postsTable(supabase: SupabaseClient): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('posts');
}

async function fetchSharedPosts(
  supabase: SupabaseClient,
  sharedPostIds: string[]
): Promise<Map<string, SharedPostData>> {
  if (!sharedPostIds.length) return new Map();

  const { data: rawShared } = await supabase
    .from('posts')
    .select('id, content, media, created_at, author_id')
    .in('id', sharedPostIds);

  if (!rawShared?.length) return new Map();

  const authorIds = [...new Set(rawShared.map((p) => p.author_id))];
  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase.from('profiles').select('user_id, avatar_url, is_verified').in('user_id', authorIds),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

  const result = new Map<string, SharedPostData>();
  for (const p of rawShared) {
    result.set(p.id, {
      id: p.id,
      content: p.content,
      media: ((p.media ?? []) as unknown) as PostMedia[],
      created_at: p.created_at,
      author: {
        id: p.author_id,
        username: userMap.get(p.author_id)?.username ?? '',
        full_name: userMap.get(p.author_id)?.full_name ?? '',
        avatar_url: profileMap.get(p.author_id)?.avatar_url ?? null,
        is_verified: profileMap.get(p.author_id)?.is_verified ?? false,
      },
    });
  }
  return result;
}

// ── Discover-feed scoring ─────────────────────────────────────────────────────
// Tune these constants to adjust ranking behaviour without touching logic.
const RANK = {
  subscribedBoost: 50,       // flat bonus for subscribed artisans (~6 extra "freshness" hours)
  likeWeight: 2,             // score per like
  commentWeight: 3,          // score per comment
  recencyHalfLifeHours: 12,  // recency score halves every N hours
} as const;

function scoreDiscoverPost(post: PostWithAuthor): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const recency = 100 * Math.exp(-Math.LN2 * ageHours / RANK.recencyHalfLifeHours);
  const engagement = post.likes_count * RANK.likeWeight + post.comments_count * RANK.commentWeight;
  const boost = (post.author.is_subscribed ?? false) ? RANK.subscribedBoost : 0;
  return recency + engagement + boost;
}

async function enrichPosts(
  supabase: SupabaseClient,
  rawPosts: RawPost[],
  currentUserId?: string
): Promise<PostWithAuthor[]> {
  if (!rawPosts.length) return [];

  const authorIds = [...new Set(rawPosts.map((p) => p.author_id))];
  const postIds = rawPosts.map((p) => p.id);

  // shares_count / shared_post_id / reactions_summary now arrive on rawPosts
  // (folded into POST_SELECT) — no separate round-trip needed.
  const sharedIds = rawPosts
    .map((p) => p.shared_post_id)
    .filter((id): id is string => !!id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribedRpc = (supabase as any).rpc('get_subscribed_user_ids', {
    p_user_ids: authorIds,
  }) as Promise<{ data: string[] | null }>;

  const [usersRes, profilesRes, likesRes, followsRes, savesRes, sharedMap, subscribedRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase.from('profiles').select('user_id, avatar_url, is_verified').in('user_id', authorIds),
    currentUserId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from('likes')
          .select('post_id, reaction_type')
          .eq('user_id', currentUserId)
          .in('post_id', postIds) as Promise<{ data: { post_id: string; reaction_type: string }[] | null }>
      : Promise.resolve({ data: [] as { post_id: string; reaction_type: string }[] }),
    currentUserId
      ? supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', authorIds)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
    currentUserId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds) as Promise<{ data: { post_id: string }[] | null }>
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    fetchSharedPosts(supabase, sharedIds),
    subscribedRpc,
  ]);

  const userMap      = new Map((usersRes.data   ?? []).map((u) => [u.id,        u]));
  const profileMap   = new Map((profilesRes.data ?? []).map((p) => [p.user_id,  p]));
  // Map from postId → reaction_type (e.g. 'like' | 'love' | ...)
  const reactionMap  = new Map((likesRes.data    ?? []).map((l) => [l.post_id, l.reaction_type ?? 'like']));
  const followingSet = new Set((followsRes.data  ?? []).map((f) => f.following_id));
  const savesData    = (savesRes as { data: { post_id: string }[] | null }).data;
  const savedSet     = new Set((savesData ?? []).map((s) => s.post_id));
  const subscribedSet = new Set<string>(subscribedRes.data ?? []);

  return rawPosts.map((p) => {
    const sharedPostId = p.shared_post_id ?? null;
    const userReaction = reactionMap.get(p.id) ?? null;
    return {
      id: p.id,
      content: p.content,
      media: ((p.media ?? []) as unknown) as PostMedia[],
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      shares_count: p.shares_count ?? 0,
      created_at: p.created_at,
      author_id: p.author_id,
      is_liked: userReaction !== null,
      user_reaction: userReaction,
      reactions_summary: p.reactions_summary ?? {},
      is_following: currentUserId ? followingSet.has(p.author_id) : undefined,
      is_saved: currentUserId ? savedSet.has(p.id) : undefined,
      shared_post_id: sharedPostId,
      shared_post: sharedPostId ? (sharedMap.get(sharedPostId) ?? null) : null,
      author: {
        id: p.author_id,
        username: userMap.get(p.author_id)?.username ?? '',
        full_name: userMap.get(p.author_id)?.full_name ?? '',
        avatar_url: profileMap.get(p.author_id)?.avatar_url ?? null,
        is_verified: profileMap.get(p.author_id)?.is_verified ?? false,
        is_subscribed: subscribedSet.has(p.author_id),
      },
    };
  });
}

// String literal (not typed) so we can request columns missing from the stale
// generated types — shares_count/shared_post_id (0021) + reactions_summary (0044).
// Selected together with the base columns to avoid a second round-trip per page.
const POST_SELECT =
  'id, content, media, likes_count, comments_count, created_at, author_id, shares_count, shared_post_id, reactions_summary';

// ── Public Server Actions ─────────────────────────────────────────────────────

export async function fetchFollowingFeed(
  currentUserId: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  const authorIds = [...new Set([currentUserId, ...followingIds])];

  let query = postsTable(supabase)
    .select(POST_SELECT)
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.or(cursorFilter(cursor));

  const { data: raw } = await query;
  const posts = raw ?? [];
  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const last = page[page.length - 1];

  return {
    posts: await enrichPosts(supabase, page as RawPost[], currentUserId),
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at as string, id: last.id as string }
        : null,
  };
}

export async function fetchDiscoverFeed(
  currentUserId?: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  let query = postsTable(supabase)
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.or(cursorFilter(cursor));

  const { data: raw } = await query;
  const posts = raw ?? [];
  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const last = page[page.length - 1];

  const enriched = await enrichPosts(supabase, page as RawPost[], currentUserId);
  enriched.sort((a, b) => scoreDiscoverPost(b) - scoreDiscoverPost(a));

  return {
    posts: enriched,
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at as string, id: last.id as string }
        : null,
  };
}

/**
 * Video-only feed: posts that contain at least one video in their media array.
 * Sorted by engagement score (same algorithm as discover feed).
 * Filters via the `has_video` stored generated column (migration 0041) — a
 * simple boolean equality that avoids JSONB @> containment via PostgREST.
 */
export async function fetchVideoFeed(
  currentUserId?: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('posts')
    .select(POST_SELECT)
    .eq('has_video', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.or(cursorFilter(cursor));

  const { data: raw } = await query;
  const posts = raw ?? [];
  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const last = page[page.length - 1];

  const enriched = await enrichPosts(supabase, page as RawPost[], currentUserId);
  enriched.sort((a, b) => scoreDiscoverPost(b) - scoreDiscoverPost(a));

  return {
    posts: enriched,
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at as string, id: last.id as string }
        : null,
  };
}

export async function fetchUserPosts(
  profileUserId: string,
  currentUserId?: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  let query = postsTable(supabase)
    .select(POST_SELECT)
    .eq('author_id', profileUserId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.or(cursorFilter(cursor));

  const { data: raw } = await query;
  const posts = raw ?? [];
  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const last = page[page.length - 1];

  return {
    posts: await enrichPosts(supabase, page as RawPost[], currentUserId),
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at as string, id: last.id as string }
        : null,
  };
}

/**
 * Smart unified feed:
 *   Phase 1 "following" — posts from followed users + own, newest first.
 *   Phase 2 "discover"  — all other posts, newest first (fallback when
 *                         following-phase is exhausted, or user has no follows).
 * Guests receive pure discover feed.
 */
export async function fetchSmartFeed(
  currentUserId?: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  // Resolve following list (empty for guests)
  let followingIds: string[] = [];
  if (currentUserId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);
    followingIds = (follows ?? []).map((f) => f.following_id as string);
  }

  const hasFollows = followingIds.length > 0;
  const phase = cursor?.phase ?? (hasFollows ? 'following' : 'discover');

  // ── Discover (guest / no-follows / phase 2) ────────────────────────────────
  if (!hasFollows || phase === 'discover') {
    let q = postsTable(supabase)
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .order('id',         { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (cursor) q = q.or(cursorFilter(cursor));

    const { data: raw } = await q;
    const posts   = raw ?? [];
    const hasMore = posts.length > PAGE_SIZE;
    const page    = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
    const last    = page[page.length - 1];

    const enriched = await enrichPosts(supabase, page as RawPost[], currentUserId);
    enriched.sort((a, b) => scoreDiscoverPost(b) - scoreDiscoverPost(a));

    return {
      posts: enriched,
      nextCursor:
        hasMore && last
          ? { phase: 'discover', created_at: last.created_at as string, id: last.id as string }
          : null,
    };
  }

  // ── Following phase ────────────────────────────────────────────────────────
  const authorIds   = [...new Set([currentUserId!, ...followingIds])];
  const baseCursor  = cursor ? { created_at: cursor.created_at, id: cursor.id } : undefined;

  let fq = postsTable(supabase)
    .select(POST_SELECT)
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (baseCursor) fq = fq.or(cursorFilter(baseCursor));

  const { data: fRaw }    = await fq;
  const fPosts            = fRaw ?? [];
  const hasMoreFollowing  = fPosts.length > PAGE_SIZE;
  const fPage             = hasMoreFollowing ? fPosts.slice(0, PAGE_SIZE) : fPosts;
  const fLast             = fPage[fPage.length - 1];

  if (hasMoreFollowing) {
    return {
      posts: await enrichPosts(supabase, fPage as RawPost[], currentUserId),
      nextCursor: fLast
        ? { phase: 'following', created_at: fLast.created_at as string, id: fLast.id as string }
        : null,
    };
  }

  // Following exhausted — fill remaining slots with discover posts
  const shortfall = PAGE_SIZE - fPage.length;
  if (shortfall === 0 || authorIds.length === 0) {
    return {
      posts: await enrichPosts(supabase, fPage as RawPost[], currentUserId),
      nextCursor: null,
    };
  }

  // Exclude already-shown authors from discover fill
  const excludeList = `(${authorIds.join(',')})`;
  const dq = postsTable(supabase)
    .select(POST_SELECT)
    .not('author_id', 'in', excludeList)
    .order('created_at', { ascending: false })
    .order('id',         { ascending: false })
    .limit(shortfall + 1);

  const { data: dRaw }    = await dq;
  const dPosts            = dRaw ?? [];
  const hasMoreDiscover   = dPosts.length > shortfall;
  const dPage             = hasMoreDiscover ? dPosts.slice(0, shortfall) : dPosts;
  const dLast             = dPage[dPage.length - 1];

  const [fEnriched, dEnriched] = await Promise.all([
    enrichPosts(supabase, fPage  as RawPost[], currentUserId),
    dPage.length > 0
      ? enrichPosts(supabase, dPage as RawPost[], currentUserId)
      : Promise.resolve([] as Awaited<ReturnType<typeof enrichPosts>>),
  ]);

  // Re-sort only the discover fill portion (following posts stay chronological)
  dEnriched.sort((a, b) => scoreDiscoverPost(b) - scoreDiscoverPost(a));

  return {
    posts: [...fEnriched, ...dEnriched],
    nextCursor:
      hasMoreDiscover && dLast
        ? { phase: 'discover', created_at: dLast.created_at as string, id: dLast.id as string }
        : null,
  };
}

type SavedRow = { post_id: string; created_at: string };

export async function fetchSavedPosts(
  currentUserId: string,
  cursor?: { saved_at: string; post_id: string }
): Promise<{ posts: PostWithAuthor[]; nextCursor: { saved_at: string; post_id: string } | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('saved_posts')
    .select('post_id, created_at')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    q = q.or(
      `created_at.lt.${cursor.saved_at},and(created_at.eq.${cursor.saved_at},post_id.lt.${cursor.post_id})`
    );
  }

  const { data: savedRows } = await q as { data: SavedRow[] | null };
  const rows = savedRows ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = page[page.length - 1];

  if (!page.length) return { posts: [], nextCursor: null };

  const postIds = page.map((r) => r.post_id);
  const { data: rawPosts } = await postsTable(supabase)
    .select(POST_SELECT)
    .in('id', postIds);

  const postMap = new Map(((rawPosts ?? []) as RawPost[]).map((p) => [p.id, p]));
  const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean);

  return {
    posts: await enrichPosts(supabase, (ordered ?? []) as RawPost[], currentUserId),
    nextCursor:
      hasMore && last
        ? { saved_at: last.created_at, post_id: last.post_id }
        : null,
  };
}

/**
 * Most-recent posts authored by the official platform account.
 * Used to pin platform announcements at the very top of the feed for ALL
 * users, bypassing follow/subscription filters. Returns [] when no official
 * account is configured (graceful no-op).
 */
export async function fetchOfficialPosts(
  currentUserId?: string,
  limit: number = OFFICIAL_PINNED_LIMIT
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const officialId = await resolveOfficialAccountId(supabase);
  if (!officialId) return [];

  const { data: raw } = await postsTable(supabase)
    .select(POST_SELECT)
    .eq('author_id', officialId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (!raw?.length) return [];
  return enrichPosts(supabase, raw as RawPost[], currentUserId);
}

export async function fetchPostById(
  postId: string,
  currentUserId?: string
): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  const { data: raw } = await postsTable(supabase)
    .select(POST_SELECT)
    .eq('id', postId)
    .single();

  if (!raw) return null;
  const enriched = await enrichPosts(supabase, [raw as RawPost], currentUserId);
  return enriched[0] ?? null;
}
