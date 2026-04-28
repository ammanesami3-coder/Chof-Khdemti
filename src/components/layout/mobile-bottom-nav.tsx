'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { cn } from '@/lib/utils';

type Props = { username: string };

export function MobileBottomNav({ username }: Props) {
  const pathname = usePathname();
  const unreadCount = useUnreadMessagesCount();

  const links = [
    { href: '/feed', label: 'الرئيسية', icon: Home },
    { href: '/explore', label: 'اكتشاف', icon: Search },
    { href: '/feed?compose=1', label: 'نشر', icon: PlusSquare, isAction: true },
    { href: '/messages', label: 'رسائل', icon: MessageCircle, badge: unreadCount },
    { href: `/profile/${username}`, label: 'ملفي', icon: User },
  ];

  function isActive(href: string) {
    const base = href.split('?')[0];
    if (base === '/feed') return pathname === '/feed';
    return pathname === base || pathname.startsWith(base + '/');
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-center justify-around">
        {links.map(({ href, label, icon: Icon, badge, isAction }) => (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className={cn(
              'relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors min-w-[44px] min-h-[44px] justify-center',
              isAction
                ? 'text-primary'
                : isActive(href)
                  ? 'text-primary'
                  : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <Icon className={cn('h-5 w-5', isAction && 'h-6 w-6')} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold leading-none text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className="text-[10px] leading-none">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
