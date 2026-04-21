"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedList } from "@/components/feed/feed-list";
import { PostComposer } from "@/components/feed/post-composer";
import type { FeedPage } from "@/lib/queries/posts";
import type { PostWithAuthor } from "@/lib/validations/post";

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser;
  initialFollowingFeed: FeedPage;
};

export function FeedTabs({ currentUser, initialFollowingFeed }: Props) {
  const [newPosts, setNewPosts] = useState<PostWithAuthor[]>([]);

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
      <Tabs defaultValue="following">
        <TabsList
          variant="line"
          className="mb-4 w-full justify-start rounded-none border-b bg-transparent p-0"
        >
          <TabsTrigger
            value="following"
            className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:bg-transparent data-active:shadow-none"
          >
            الفيد
          </TabsTrigger>
          <TabsTrigger
            value="discover"
            className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:bg-transparent data-active:shadow-none"
          >
            اكتشاف
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following">
          <FeedList
            feedType="following"
            currentUserId={currentUser.id}
            currentUser={currentUser}
            initialData={initialFollowingFeed}
            newPosts={newPosts}
          />
        </TabsContent>

        <TabsContent value="discover">
          <FeedList
            feedType="discover"
            currentUserId={currentUser.id}
            currentUser={currentUser}
          />
        </TabsContent>
      </Tabs>

      <PostComposer
        currentUser={currentUser}
        onPostCreating={handlePostCreating}
        onPostCreated={handlePostCreated}
        onPostError={handlePostError}
      />
    </>
  );
}
