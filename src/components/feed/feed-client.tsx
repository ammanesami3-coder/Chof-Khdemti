"use client";

import { useState } from "react";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard } from "@/components/feed/post-card";
import type { PostWithAuthor } from "@/lib/validations/post";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser;
};

export function FeedClient({ currentUser }: Props) {
  // Optimistically prepended posts — task 3 will merge with infinite scroll list
  const [newPosts, setNewPosts] = useState<PostWithAuthor[]>([]);

  function handlePostCreated(post: PostWithAuthor) {
    setNewPosts((prev) => [post, ...prev]);
  }

  return (
    <>
      {/* Optimistic new posts at the top */}
      {newPosts.length > 0 && (
        <div className="space-y-4">
          {newPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Placeholder — will be replaced with TanStack Query infinite scroll in task 3 */}
      {newPosts.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            ابدأ بمتابعة حرفيين من{" "}
            <a href="/explore" className="text-primary hover:underline">
              صفحة الاكتشاف
            </a>{" "}
            لرؤية منشوراتهم هنا
          </p>
        </div>
      )}

      {/* FAB + Dialog */}
      <PostComposer
        currentUser={currentUser}
        onPostCreated={handlePostCreated}
      />
    </>
  );
}
