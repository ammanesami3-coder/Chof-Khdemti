import { z } from 'zod';

export const mediaItemSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().url(),
  thumbnail: z.string().url(),
  duration: z.number().optional(),
  publicId: z.string().optional(),
});

export const postSchema = z
  .object({
    content: z.string().max(2000).optional(),
    media: z.array(mediaItemSchema).max(10),
  })
  .refine(
    (d) => (d.content?.trim() ?? '').length > 0 || d.media.length > 0,
    { message: 'أضف نصاً أو وسيطة على الأقل' }
  );

export type CreatePostInput = z.infer<typeof postSchema>;

export type PostMedia = {
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  duration?: number;
  publicId?: string;
};

export type RecentComment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  likes_count?: number;
  is_liked?: boolean;
  /** The current user's reaction type, e.g. 'like' | 'love' | null */
  user_reaction?: string | null;
  /** Per-reaction counts for the comment badge, e.g. { like: 3, love: 1 } */
  reactions_summary?: Record<string, number> | null;
  parent_comment_id?: string | null;
  author: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  replies?: RecentComment[];
};

/** Minimal embedded data for a shared (original) post */
export type SharedPostData = {
  id: string;
  content: string | null;
  media: PostMedia[];
  created_at: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
  };
};

export type PostWithAuthor = {
  id: string;
  content: string | null;
  media: PostMedia[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  author_id: string;
  /** Whether the currently-authenticated user has reacted to this post */
  is_liked?: boolean;
  /** The current user's reaction type, e.g. 'like' | 'love' | null */
  user_reaction?: string | null;
  /** Per-reaction counts, e.g. { like: 5, love: 12 } — from posts.reactions_summary */
  reactions_summary?: Record<string, number>;
  /** Whether the currently-authenticated user follows this post's author */
  is_following?: boolean;
  /** Whether the currently-authenticated user has saved/bookmarked this post */
  is_saved?: boolean;
  /** True while the post is being optimistically shown before server confirms */
  is_pending?: boolean;
  /** Set when this post is a repost of another */
  shared_post_id?: string | null;
  /** Embedded original post data when shared_post_id is set */
  shared_post?: SharedPostData | null;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    /** From profiles.is_verified */
    is_verified?: boolean;
    /** True when the author has an active trial or paid subscription */
    is_subscribed?: boolean;
  };
  /** Last 2 comments, populated by the feed query */
  recent_comments?: RecentComment[];
};
