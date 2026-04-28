import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/navbar';
import { NotificationListener } from '@/components/layout/notification-listener';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <Navbar />
      {user && <NotificationListener currentUserId={user.id} />}
      {children}
    </div>
  );
}
