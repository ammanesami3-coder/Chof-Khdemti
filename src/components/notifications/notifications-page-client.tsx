'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/lib/actions/notifications';
import { NotificationItemCard } from './notification-item';
import { Button } from '@/components/ui/button';

function groupByDate(notifications: NotificationItem[]) {
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  for (const n of notifications) {
    const date = new Date(n.created_at);
    if (isToday(date)) today.push(n);
    else if (isYesterday(date)) yesterday.push(n);
    else if (isThisWeek(date, { weekStartsOn: 1 })) thisWeek.push(n);
    else older.push(n);
  }

  const groups: { label: string; items: NotificationItem[] }[] = [];
  if (today.length) groups.push({ label: 'اليوم', items: today });
  if (yesterday.length) groups.push({ label: 'الأمس', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'هذا الأسبوع', items: thisWeek });
  if (older.length) groups.push({ label: 'أقدم', items: older });

  return groups;
}

type Props = {
  initialNotifications: NotificationItem[];
  initialHasMore: boolean;
};

export function NotificationsPageClient({
  initialNotifications,
  initialHasMore,
}: Props) {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Ref to always have latest notifications list inside the event handler
  // without re-registering the listener on every render
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // ── Listen for realtime notification events from GlobalRealtimeProvider ──
  // GlobalRealtimeProvider dispatches 'chof:new-notification' on every INSERT
  // in the notifications table. We fetch the newest item and prepend it.
  useEffect(() => {
    let pending = false;

    async function handleNewNotification() {
      // Debounce concurrent events: skip if a fetch is already in-flight
      if (pending) return;
      pending = true;

      try {
        const result = await getNotifications(1, 0);
        const newest = result.data[0];
        if (!newest) return;

        setNotifications((prev) => {
          // Skip if already in the list (idempotency)
          if (prev.some((n) => n.id === newest.id)) return prev;
          return [newest, ...prev];
        });
      } finally {
        pending = false;
      }
    }

    window.addEventListener('chof:new-notification', handleNewNotification);
    return () =>
      window.removeEventListener('chof:new-notification', handleNewNotification);
  }, []); // empty deps — handler captures ref, not state

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(notifications);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      queryClient.setQueryData(
        ['unread-notifications-count'],
        (old: number | undefined) => Math.max(0, (old ?? 0) - 1),
      );
    },
    onError: () => toast.error('تعذّر تعليم الإشعار كمقروء'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      queryClient.setQueryData(['unread-notifications-count'], 0);
    },
    onError: () => toast.error('تعذّر تعليم الإشعارات كمقروءة'),
  });

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const result = await getNotifications(20, notifications.length);
      setNotifications((prev) => [...prev, ...result.data]);
      setHasMore(result.data.length === 20);
    } catch {
      toast.error('تعذّر تحميل المزيد من الإشعارات');
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleRead(id: string) {
    const notification = notifications.find((n) => n.id === id);
    if (notification && !notification.is_read) {
      markReadMutation.mutate(id);
    }
  }

  return (
    <div dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">الإشعارات</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 text-primary hover:text-primary"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            تعليم الكل كمقروء
          </Button>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-24 text-center">
          <Bell className="size-16 text-muted-foreground/25" />
          <p className="text-base font-semibold text-muted-foreground">
            لا توجد إشعارات بعد
          </p>
          <p className="text-sm text-muted-foreground/60">
            ستظهر هنا إشعارات الإعجابات والتعليقات والمتابعات
          </p>
        </div>
      ) : (
        /* ── Grouped list ─────────────────────────────────────────────────── */
        <div className="overflow-hidden rounded-xl border bg-card">
          {groups.map((group, gi) => (
            <div key={group.label}>
              {/* Date section header */}
              <div className="border-b bg-muted/30 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </span>
              </div>

              {/* Notification items */}
              {group.items.map((notification) => (
                <NotificationItemCard
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                />
              ))}

              {gi < groups.length - 1 && <div className="border-t" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Load more ───────────────────────────────────────────────────────── */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="min-w-36"
          >
            {isLoadingMore ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'تحميل المزيد'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
