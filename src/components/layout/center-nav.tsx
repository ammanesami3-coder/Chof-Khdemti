'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, Bell, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';

type ItemProps = {
  href?: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  disabled?: boolean;
};

function NavItem({ href, icon: Icon, label, badge = 0, active = false, disabled = false }: ItemProps) {
  const cls = cn(
    'relative flex items-center justify-center h-full group/item transition-colors',
    'w-14 md:w-[72px] lg:w-[88px] xl:w-[108px]',
    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
  );

  const body = (
    <>
      {/* Hover/active background */}
      <span
        className={cn(
          'absolute inset-y-[9px] inset-x-[4px] rounded-xl transition-colors duration-150',
          active
            ? 'bg-[#FF9F43]/10'
            : !disabled && 'group-hover/item:bg-muted',
        )}
      />

      {/* Icon + badge */}
      <span className="relative z-10">
        <Icon
          className={cn(
            'h-[26px] w-[26px] transition-colors duration-150',
            active
              ? 'text-[#FF9F43]'
              : disabled
              ? 'text-muted-foreground/40'
              : 'text-muted-foreground group-hover/item:text-foreground',
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        {badge > 0 && (
          <span className="absolute -top-2 -end-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[3px] text-[10px] font-bold leading-none text-white ring-2 ring-background"
            style={{ background: 'var(--brand-gradient)' }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>

      {/* Active bottom indicator — spans full item width */}
      {active && (
        <span className="absolute bottom-0 inset-x-0 h-[3px] rounded-t-sm"
          style={{ background: 'var(--brand-gradient)' }} />
      )}
    </>
  );

  if (disabled || !href) {
    return (
      <span className={cls} title={label} aria-label={label}>
        {body}
      </span>
    );
  }

  return (
    <Link href={href} title={label} aria-label={label} className={cls}>
      {body}
    </Link>
  );
}

/* Full nav — for logged-in users (5 items with live badges) */
export function CenterNav() {
  const pathname = usePathname();
  const unreadMessages = useUnreadMessagesCount();
  const unreadNotifications = useUnreadNotificationsCount();

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname === '/feed';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex items-stretch h-full">
      <NavItem href="/" icon={Home} label="الرئيسية" active={isActive('/')} />
      <NavItem href="/explore" icon={Users} label="الحرفيون" active={isActive('/explore')} />
      <NavItem
        href="/messages"
        icon={MessageCircle}
        label="الرسائل"
        badge={unreadMessages}
        active={isActive('/messages')}
      />
      <NavItem
        href="/notifications"
        icon={Bell}
        label="الإشعارات"
        badge={unreadNotifications}
        active={isActive('/notifications')}
      />
      <NavItem icon={Video} label="الفيديوهات" disabled />
    </div>
  );
}

/* Guest nav — 2 items, no DB calls */
export function GuestCenterNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex items-stretch h-full">
      <NavItem href="/" icon={Home} label="الرئيسية" active={isActive('/')} />
      <NavItem href="/explore" icon={Users} label="الحرفيون" active={isActive('/explore')} />
    </div>
  );
}
