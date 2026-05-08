import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getNotifications } from '@/lib/actions/notifications';
import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';

export const metadata = { title: 'الإشعارات — Chof Khdemti' };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const initial = await getNotifications(20, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <NotificationsPageClient
        initialNotifications={initial.data}
        initialHasMore={initial.data.length === 20}
      />
    </main>
  );
}
