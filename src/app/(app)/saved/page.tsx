import { Bookmark } from 'lucide-react';
import { requireUser } from '@/lib/supabase/require-user';
import { fetchSavedPosts } from '@/lib/queries/posts';
import { BackButton } from '@/components/shared/back-button';
import { SavedFeed } from '@/components/saved/saved-feed';
import { SavedEmpty } from '@/components/saved/saved-empty';
import { PageTitle } from '@/components/shared/page-title';

export const metadata = { title: 'المحفوظات — Chof Khdemti' };

export default async function SavedPage() {
  const { supabase, user } = await requireUser();

  const [userRes, initialData] = await Promise.all([
    supabase.from('users').select('id, username, full_name, avatar_url:profiles(avatar_url)').eq('id', user.id).single(),
    fetchSavedPosts(user.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = (userRes.data as any)?.avatar_url;
  const avatarUrl = Array.isArray(profileData)
    ? (profileData[0]?.avatar_url ?? null)
    : null;

  const currentUser = userRes.data
    ? {
        id: user.id,
        username: userRes.data.username as string,
        full_name: userRes.data.full_name as string,
        avatar_url: avatarUrl,
      }
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <div className="flex items-center gap-2">
          <Bookmark className="size-5 text-primary" />
          <PageTitle tKey="savedPageTitle" />
        </div>
      </div>

      {initialData.posts.length === 0 ? (
        <SavedEmpty />
      ) : (
        <SavedFeed
          initialData={initialData}
          currentUser={currentUser}
          currentUserId={user.id}
        />
      )}
    </main>
  );
}
