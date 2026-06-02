import { NotificationsSkeleton } from '@/components/notifications/notifications-skeleton';

export default function NotificationsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <NotificationsSkeleton />
    </main>
  );
}
