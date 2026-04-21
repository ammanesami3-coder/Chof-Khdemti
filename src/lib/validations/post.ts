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
  author: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export type PostWithAuthor = {
  id: string;
  content: string | null;
  media: PostMedia[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  /** Whether the currently-authenticated user has liked this post */
  is_liked?: boolean;
  /** True while the post is being optimistically shown before server confirms */
  is_pending?: boolean;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    /** From profiles.is_verified */
    is_verified?: boolean;
  };
  /** Last 2 comments, populated by the feed query (task 3) */
  recent_comments?: RecentComment[];
};
