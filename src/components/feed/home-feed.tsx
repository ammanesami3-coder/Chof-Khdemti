'use client';

import { useState, useEffect } from 'react';
import { FeedList } from '@/components/feed/feed-list';
import { PostComposer } from '@/components/feed/post-composer';
import type { FeedPage } from '@/lib/queries/posts';
import type { PostWithAuthor } from '@/lib/validations/post';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser | null;
  initialFeed: FeedPage;
};

export function HomeFeed({ currentUser, initialFeed }: Props) {
  const [newPosts, setNewPosts] = useState<PostWithAuthor[]>([]);

  // Listen for optimistic updates dispatched by PostComposer (home or global instance)
  useEffect(() => {
    function onCreating(e: Event) {
      setNewPosts((prev) => [(e as CustomEvent<PostWithAuthor>).detail, ...prev]);
    }
    function onCreated(e: Event) {
      const { realPost, tempId } = (e as CustomEvent<{ realPost: PostWithAuthor; tempId: string }>).detail;
      setNewPosts((prev) => prev.map((p) => (p.id === tempId ? { ...realPost, is_pending: false } : p)));
    }
    function onError(e: Event) {
      setNewPosts((prev) => prev.filter((p) => p.id !== (e as CustomEvent<string>).detail));
    }

    window.addEventListener('post:creating', onCreating);
    window.addEventListener('post:created', onCreated);
    window.addEventListener('post:error', onError);
    return () => {
      window.removeEventListener('post:creating', onCreating);
      window.removeEventListener('post:created', onCreated);
      window.removeEventListener('post:error', onError);
    };
  }, []);

  return (
    <>
      <FeedList
        feedType="smart"
        currentUserId={currentUser?.id}
        currentUser={currentUser ?? undefined}
        initialData={initialFeed}
        newPosts={newPosts}
      />
      {currentUser && (
        <PostComposer
          currentUser={currentUser}
          onPostCreating={(p) => window.dispatchEvent(new CustomEvent('post:creating', { detail: p }))}
          onPostCreated={(r, t) => window.dispatchEvent(new CustomEvent('post:created', { detail: { realPost: r, tempId: t } }))}
          onPostError={(t) => window.dispatchEvent(new CustomEvent('post:error', { detail: t }))}
        />
      )}
    </>
  );
}
