import { createClient } from '@/lib/supabase/server';
import { fetchSmartFeed } from '@/lib/queries/posts';
import { getActiveStatuses } from '@/lib/actions/status';
import { Navbar } from '@/components/layout/navbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { GlobalRealtimeProvider } from '@/components/providers/global-realtime-provider';
import { StatusBar } from '@/components/status/status-bar';
import { HomeFeed } from '@/components/feed/home-feed';

export const metadata = {
  title: 'Chof Khdemti — منصة الحرفيين المغاربة',
  description:
    'اكتشف أفضل الحرفيين في مدينتك، وشارك أعمالك مع آلاف الزبائن. منصة اجتماعية متخصصة للحرفيين في المغرب.',
};

type Props = { searchParams: Promise<{ compose?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const { compose } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null = null;

  if (user) {
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('id, username, full_name').eq('id', user.id).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
    ]);
    if (userRes.data) {
      currentUser = {
        id: user.id,
        username: userRes.data.username as string,
        full_name: userRes.data.full_name as string,
        avatar_url: (profileRes.data?.avatar_url as string | null) ?? null,
      };
    }
  }

  const [initialFeed, initialGroups] = await Promise.all([
    fetchSmartFeed(currentUser?.id),
    currentUser ? getActiveStatuses() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <Navbar />
      {currentUser && (
        <>
          <GlobalRealtimeProvider currentUserId={currentUser.id} />
          <MobileBottomNav username={currentUser.username} />
        </>
      )}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {currentUser && (
          <StatusBar currentUser={currentUser} initialGroups={initialGroups} />
        )}
        <HomeFeed
          currentUser={currentUser}
          initialFeed={initialFeed}
          composeOnMount={compose === '1'}
        />
      </main>
    </div>
  );
}
