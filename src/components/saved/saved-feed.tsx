'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PostCard } from '@/components/feed/post-card';
import { fetchSavedPosts } from '@/lib/queries/posts';
import type { PostWithAuthor } from '@/lib/validations/post';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Cursor = { saved_at: string; post_id: string };

type Props = {
  initialData: { posts: PostWithAuthor[]; nextCursor: Cursor | null };
  currentUser: CurrentUser | null;
  currentUserId: string;
};

export function SavedFeed({ initialData, currentUser, currentUserId }: Props) {
  const [posts, setPosts] = useState(initialData.posts);
  const [nextCursor, setNextCursor] = useState(initialData.nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !nextCursor) return;

      observerRef.current = new IntersectionObserver(
        async ([entry]) => {
          if (!entry?.isIntersecting || isLoading) return;
          setIsLoading(true);
          const page = await fetchSavedPosts(currentUserId, nextCursor ?? undefined);
          setPosts((prev) => [...prev, ...page.posts]);
          setNextCursor(page.nextCursor);
          setIsLoading(false);
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    },
    [currentUserId, nextCursor, isLoading]
  );

  function handleDelete(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          currentUser={currentUser ?? undefined}
          onDelete={handleDelete}
          priority={i === 0}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!nextCursor && posts.length > 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          لا توجد منشورات محفوظة أخرى
        </p>
      )}
    </div>
  );
}
