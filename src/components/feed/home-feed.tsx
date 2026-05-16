'use client';

import { useState, useEffect, useRef } from 'react';
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
  composeOnMount?: boolean;
};

export function HomeFeed({ currentUser, initialFeed, composeOnMount = false }: Props) {
  const [newPosts, setNewPosts] = useState<PostWithAuthor[]>([]);
  const [composeTrigger, setComposeTrigger] = useState(0);
  const composeOnMountRef = useRef(composeOnMount);

  useEffect(() => {
    if (composeOnMountRef.current) {
      setComposeTrigger(1);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  function handlePostCreating(tempPost: PostWithAuthor) {
    setNewPosts((prev) => [tempPost, ...prev]);
  }

  function handlePostCreated(realPost: PostWithAuthor, tempId: string) {
    setNewPosts((prev) =>
      prev.map((p) => (p.id === tempId ? { ...realPost, is_pending: false } : p))
    );
  }

  function handlePostError(tempId: string) {
    setNewPosts((prev) => prev.filter((p) => p.id !== tempId));
  }

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
          onPostCreating={handlePostCreating}
          onPostCreated={handlePostCreated}
          onPostError={handlePostError}
          openTrigger={composeTrigger}
        />
      )}
    </>
  );
}
