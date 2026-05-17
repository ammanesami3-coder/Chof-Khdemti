import { createClient } from '@/lib/supabase/server';
import { fetchSmartFeed } from '@/lib/queries/posts';
import { getActiveStatuses } from '@/lib/actions/status';
import { Navbar } from '@/components/layout/navbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { GlobalRealtimeProvider } from '@/components/providers/global-realtime-provider';
import { StatusBar } from '@/components/status/status-bar';
import { HomeFeed } from '@/components/feed/home-feed';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { RightSidebar } from '@/components/layout/right-sidebar';

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

  const sidebarUser = currentUser
    ? { username: currentUser.username, full_name: currentUser.full_name, avatar_url: currentUser.avatar_url }
    : null;

  return (
    <SidebarProvider>
      {/* Viewport layout: navbar fixed at top, two sidebars stay put, only the center column scrolls */}
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar />
        <MobileSidebar user={sidebarUser} />

        <div dir="ltr" className="flex flex-1 overflow-hidden min-h-0">
          <LeftSidebar user={sidebarUser} />

          <main
            dir="rtl"
            className="flex-1 overflow-y-auto min-w-0 py-4 lg:py-6 px-3 sm:px-0 pb-20 md:pb-6"
          >
            <div className="mx-auto max-w-[680px]">
              {currentUser && (
                <StatusBar currentUser={currentUser} initialGroups={initialGroups} />
              )}
              <HomeFeed
                currentUser={currentUser}
                initialFeed={initialFeed}
                composeOnMount={compose === '1'}
              />
            </div>
          </main>

          <RightSidebar currentUserId={currentUser?.id} />
        </div>

        {currentUser && (
          <>
            <GlobalRealtimeProvider currentUserId={currentUser.id} />
            <MobileBottomNav username={currentUser.username} />
          </>
        )}
      </div>
    </SidebarProvider>
  );
}
