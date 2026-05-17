'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';

export function MobileNotifButton() {
  const count = useUnreadNotificationsCount();

  return (
    <Link
      href="/notifications"
      aria-label="الإشعارات"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
