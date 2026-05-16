'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useLang } from '@/lib/i18n/language-context';

type Props = { showLabel?: boolean };

export function NotificationsNavLink({ showLabel = true }: Props) {
  const count = useUnreadNotificationsCount();
  const { t } = useLang();

  return (
    <Link
      href="/notifications"
      aria-label={t('notifications')}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className="relative">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      {showLabel && <span>{t('notifications')}</span>}
    </Link>
  );
}
