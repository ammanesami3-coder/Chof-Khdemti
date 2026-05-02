import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowingFeed } from "@/lib/queries/posts";
import { getActiveStatuses } from "@/lib/actions/status";
import { FeedTabs } from "@/components/feed/feed-tabs";
import { StatusBar } from "@/components/status/status-bar";

export const metadata = { title: "الفيد — Chof Khdemti" };

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [userRes, profileRes, initialFeed, initialGroups] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .single(),
    fetchFollowingFeed(user.id),
    getActiveStatuses(),
  ]);

  if (!userRes.data) redirect("/login");

  const currentUser = {
    id: user.id,
    username: userRes.data.username as string,
    full_name: userRes.data.full_name as string,
    avatar_url: (profileRes.data?.avatar_url as string | null) ?? null,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <StatusBar currentUser={currentUser} initialGroups={initialGroups} />
      <FeedTabs currentUser={currentUser} initialFollowingFeed={initialFeed} />
    </main>
  );
}
