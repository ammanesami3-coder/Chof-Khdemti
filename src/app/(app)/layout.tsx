import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/navbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { GlobalRealtimeProvider } from '@/components/providers/global-realtime-provider';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();
    username = data?.username ?? null;
  }

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <Navbar />
      {user && username && (
        <>
          <GlobalRealtimeProvider currentUserId={user.id} />
          <MobileBottomNav username={username} />
        </>
      )}
      {children}
    </div>
  );
}
