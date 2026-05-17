import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/navbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { GlobalRealtimeProvider } from '@/components/providers/global-realtime-provider';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import type { SidebarUser } from '@/components/layout/left-sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let sidebarUser: SidebarUser | null = null;
  if (user) {
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('username, full_name').eq('id', user.id).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
    ]);
    if (userRes.data) {
      sidebarUser = {
        username: userRes.data.username as string,
        full_name: userRes.data.full_name as string,
        avatar_url: profileRes.data?.avatar_url ?? null,
      };
    }
  }

  const username = sidebarUser?.username ?? null;

  return (
    <SidebarProvider>
      <div className="min-h-screen pb-16 md:pb-0">
        <Navbar />
        <MobileSidebar user={sidebarUser} />

        <div dir="rtl" className="mx-auto max-w-[1440px]">
          {children}
        </div>

        {user && username && (
          <>
            <GlobalRealtimeProvider currentUserId={user.id} />
            <MobileBottomNav username={username} />
          </>
        )}
      </div>
    </SidebarProvider>
  );
}
