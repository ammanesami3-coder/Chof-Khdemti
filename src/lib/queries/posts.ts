'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostMedia, PostWithAuthor, SharedPostData } from '@/lib/validations/post';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeedCursor = { created_at: string; id: string };

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
};

function cursorFilter(cursor: FeedCursor) {
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

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

async function enrichPosts(
  supabase: SupabaseClient,
  rawPosts: RawPost[],
  currentUserId?: string
): Promise<PostWithAuthor[]> {
  if (!rawPosts.length) return [];

  const authorIds = [...new Set(rawPosts.map((p) => p.author_id))];
  const postIds = rawPosts.map((p) => p.id);

  // Fetch shares_count + shared_post_id via any-cast (new columns not in generated types yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: extrasRows } = await (supabase as any)
    .from('posts')
    .select('id, shares_count, shared_post_id')
    .in('id', postIds) as {
      data: { id: string; shares_count: number; shared_post_id: string | null }[] | null;
    };
  const extrasMap = new Map((extrasRows ?? []).map((r) => [r.id, r]));

  const sharedIds = (extrasRows ?? [])
    .map((r) => r.shared_post_id)
    .filter((id): id is string => !!id);

  const [usersRes, profilesRes, likesRes, sharedMap] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase.from('profiles').select('user_id, avatar_url, is_verified').in('user_id', authorIds),
    currentUserId
      ? supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    fetchSharedPosts(supabase, sharedIds),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const likedSet = new Set((likesRes.data ?? []).map((l) => l.post_id));

  return rawPosts.map((p) => {
    const extras = extrasMap.get(p.id);
    const sharedPostId = extras?.shared_post_id ?? null;
    return {
      id: p.id,
      content: p.content,
      media: ((p.media ?? []) as unknown) as PostMedia[],
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      shares_count: extras?.shares_count ?? 0,
      created_at: p.created_at,
      author_id: p.author_id,
      is_liked: likedSet.has(p.id),
      shared_post_id: sharedPostId,
      shared_post: sharedPostId ? (sharedMap.get(sharedPostId) ?? null) : null,
      author: {
        id: p.author_id,
        username: userMap.get(p.author_id)?.username ?? '',
        full_name: userMap.get(p.author_id)?.full_name ?? '',
        avatar_url: profileMap.get(p.author_id)?.avatar_url ?? null,
        is_verified: profileMap.get(p.author_id)?.is_verified ?? false,
      },
    };
  });
}

// shares_count and shared_post_id added in migration 0021 — use string literal to bypass stale types
const POST_SELECT = 'id, content, media, likes_count, comments_count, created_at, author_id';

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

  let query = supabase
    .from('posts')
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

  let query = supabase
    .from('posts')
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

  return {
    posts: await enrichPosts(supabase, page as RawPost[], currentUserId),
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

  let query = supabase
    .from('posts')
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

export async function fetchPostById(
  postId: string,
  currentUserId?: string
): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single();

  if (!raw) return null;
  const enriched = await enrichPosts(supabase, [raw as RawPost], currentUserId);
  return enriched[0] ?? null;
}
