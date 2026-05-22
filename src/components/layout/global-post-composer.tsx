'use client';

import { PostComposer } from '@/components/feed/post-composer';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export function GlobalPostComposer({ currentUser }: { currentUser: CurrentUser }) {
  return <PostComposer currentUser={currentUser} />;
}
