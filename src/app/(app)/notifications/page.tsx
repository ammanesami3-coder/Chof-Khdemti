import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getNotifications } from '@/lib/actions/notifications';
import { getCurrentAppUser } from '@/lib/supabase/get-current-user';
import { NotificationsPageClient } from '@/components/notifications/notifications-page-client';
import { NotificationsSkeleton } from '@/components/notifications/notifications-skeleton';

export const metadata = { title: 'الإشعارات — Chof Khdemti' };

/** Streams the notifications list — the only DB-touching part of the page. */
async function NotificationsData() {
  if (!(await getCurrentAppUser())) redirect('/login');

  const initial = await getNotifications(20, 0);
  return (
    <NotificationsPageClient
      initialNotifications={initial.data}
      initialHasMore={initial.data.length === 20}
    />
  );
}

export default function NotificationsPage() {
  // Synchronous page component → the wrapper paints instantly; the list streams
  // in behind the skeleton inside the Suspense boundary.
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsData />
      </Suspense>
    </main>
  );
}
