'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUnreadNotificationsCount,
  useNotifications,
} from '@/hooks/use-notifications';
import { NotificationItemCard } from './notification-item';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow">
      {count > 99 ? '99+' : count}
    </span>
  );
}

type Props = { showLabel?: boolean };

export function NotificationsPopover({ showLabel = true }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const count = useUnreadNotificationsCount();
  const { notifications, isLoading, markRead, markAllRead } = useNotifications();

  const close = useCallback(() => setOpen(false), []);

  // Fetch on open
  const hasUnread = count > 0;

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        panelRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      close();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        aria-expanded={open}
        className={cn(
          'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          open && 'bg-accent text-foreground',
        )}
      >
        <span className="relative">
          <Bell className="h-4 w-4" />
          <Badge count={count} />
        </span>
        {showLabel && <span>الإشعارات</span>}
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={close}
            aria-hidden
          />

          <div
            ref={panelRef}
            className={cn(
              'absolute end-0 top-full z-50 mt-1.5',
              'w-[min(360px,_calc(100vw-2rem))]',
              'overflow-hidden rounded-xl border bg-background shadow-2xl',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150',
            )}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-bold">الإشعارات</h2>
              {hasUnread && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  تعليم الكل كمقروء
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto sm:max-h-[460px]">
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-2 py-2">
                      <div className="size-11 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <Bell className="size-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    لا توجد إشعارات بعد
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    ستظهر هنا إشعارات الإعجابات والتعليقات والمتابعات
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItemCard
                    key={n.id}
                    notification={n}
                    onRead={markRead}
                    onClose={close}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t px-4 py-2.5 text-center">
                <span className="text-xs text-muted-foreground">
                  آخر 20 إشعار
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
