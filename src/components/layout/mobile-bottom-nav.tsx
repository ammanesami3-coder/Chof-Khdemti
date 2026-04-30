'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { cn } from '@/lib/utils';

type Props = { username: string };

const ICON_CLASS = 'h-5 w-5';
const LINK_BASE =
  'relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 transition-colors min-w-[44px] min-h-[44px]';

export function MobileBottomNav({ username }: Props) {
  const pathname = usePathname();
  const unreadCount = useUnreadMessagesCount();

  function isActive(href: string) {
    if (href === '/feed') return pathname === '/feed';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const activeClass = 'text-primary';
  const inactiveClass = 'text-muted-foreground';

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-center justify-around">

        {/* الرئيسية */}
        <Link
          href="/feed"
          aria-label="الرئيسية"
          className={cn(LINK_BASE, isActive('/feed') ? activeClass : inactiveClass)}
        >
          <Home className={ICON_CLASS} />
          <span className="text-[10px] leading-none">الرئيسية</span>
        </Link>

        {/* اكتشاف */}
        <Link
          href="/explore"
          aria-label="اكتشاف"
          className={cn(LINK_BASE, isActive('/explore') ? activeClass : inactiveClass)}
        >
          <Search className={ICON_CLASS} />
          <span className="text-[10px] leading-none">اكتشاف</span>
        </Link>

        {/* نشر */}
        <Link
          href="/feed?compose=1"
          aria-label="نشر"
          className={cn(LINK_BASE, 'text-primary')}
        >
          <PlusSquare className="h-6 w-6" />
          <span className="text-[10px] leading-none">نشر</span>
        </Link>

        {/* رسائل — مع badge */}
        <Link
          href="/messages"
          aria-label="رسائل"
          className={cn(LINK_BASE, isActive('/messages') ? activeClass : inactiveClass)}
        >
          <div className="relative">
            <MessageCircle className={ICON_CLASS} />
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5',
                  'flex min-w-[18px] h-[18px] items-center justify-center px-1',
                  'rounded-full bg-red-600 text-white text-[10px] font-bold leading-none',
                  'ring-2 ring-background',
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-none">رسائل</span>
        </Link>

        {/* ملفي */}
        <Link
          href={`/profile/${username}`}
          aria-label="ملفي"
          className={cn(LINK_BASE, isActive(`/profile/${username}`) ? activeClass : inactiveClass)}
        >
          <User className={ICON_CLASS} />
          <span className="text-[10px] leading-none">ملفي</span>
        </Link>

      </div>
    </nav>
  );
}
