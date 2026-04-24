'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostMedia, PostWithAuthor } from '@/lib/validations/post';

// ── Types ────────────────────────────────────────────────────────────────────

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
  created_at: string;
  author_id: string;
};

function cursorFilter(cursor: FeedCursor) {
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function enrichPosts(
  supabase: SupabaseClient,
  rawPosts: RawPost[],
  currentUserId?: string
): Promise<PostWithAuthor[]> {
  if (!rawPosts.length) return [];

  const authorIds = [...new Set(rawPosts.map((p) => p.author_id))];
  const postIds = rawPosts.map((p) => p.id);

  const [usersRes, profilesRes, likesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', authorIds),
    supabase
      .from('profiles')
      .select('user_id, avatar_url, is_verified')
      .in('user_id', authorIds),
    currentUserId
      ? supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const userMap = new Map(usersRes.data?.map((u) => [u.id, u]) ?? []);
  const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) ?? []);
  const likedSet = new Set(likesRes.data?.map((l) => l.post_id) ?? []);

  return rawPosts.map((p) => ({
    id: p.id,
    content: p.content,
    media: ((p.media ?? []) as unknown) as PostMedia[],
    likes_count: p.likes_count,
    comments_count: p.comments_count,
    created_at: p.created_at,
    author_id: p.author_id,
    is_liked: likedSet.has(p.id),
    author: {
      id: p.author_id,
      username: userMap.get(p.author_id)?.username ?? '',
      full_name: userMap.get(p.author_id)?.full_name ?? '',
      avatar_url: profileMap.get(p.author_id)?.avatar_url ?? null,
      is_verified: profileMap.get(p.author_id)?.is_verified ?? false,
    },
  }));
}

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
  // Always include the user's own posts alongside those they follow
  const authorIds = [...new Set([currentUserId, ...followingIds])];

  let query = supabase
    .from('posts')
    .select('id, content, media, likes_count, comments_count, created_at, author_id')
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
    nextCursor: hasMore && last ? { created_at: last.created_at as string, id: last.id as string } : null,
  };
}

export async function fetchDiscoverFeed(
  currentUserId?: string,
  cursor?: FeedCursor
): Promise<FeedPage> {
  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select('id, content, media, likes_count, comments_count, created_at, author_id')
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
    nextCursor: hasMore && last ? { created_at: last.created_at as string, id: last.id as string } : null,
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
    .select('id, content, media, likes_count, comments_count, created_at, author_id')
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
    nextCursor: hasMore && last ? { created_at: last.created_at as string, id: last.id as string } : null,
  };
}

export async function fetchPostById(
  postId: string,
  currentUserId?: string
): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from('posts')
    .select('id, content, media, likes_count, comments_count, created_at, author_id')
    .eq('id', postId)
    .single();

  if (!raw) return null;
  const enriched = await enrichPosts(supabase, [raw as RawPost], currentUserId);
  return enriched[0] ?? null;
}
