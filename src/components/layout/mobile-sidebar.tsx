'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X, Home, MessageCircle, Bell, Users, Bookmark,
  Settings, CreditCard, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useSidebar } from './sidebar-context';
import { useLang } from '@/lib/i18n/language-context';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

export type MobileSidebarUser = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

// ── Craft shortcuts ────────────────────────────────────────────────────────────

const CRAFTS = [
  { emoji: '🪵', label: 'نجارة' },
  { emoji: '⚡', label: 'كهرباء' },
  { emoji: '🎨', label: 'صباغة' },
  { emoji: '🔧', label: 'سباكة' },
  { emoji: '🚗', label: 'ميكانيك' },
];

// ── NavItem ────────────────────────────────────────────────────────────────────

type NavItemProps = {
  href: string;
  icon?: React.ElementType;
  emoji?: string;
  label: string;
  badge?: number;
  onClick: () => void;
};

function NavItem({ href, icon: Icon, emoji, label, badge, onClick }: NavItemProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-[#FF9F43]/10 text-[#FF9F43] dark:bg-[#FF9F43]/15 dark:text-[#FFBA69]'
          : 'text-foreground/80 hover:bg-accent',
      )}
    >
      <span className="relative shrink-0">
        {emoji ? (
          <span className="text-xl leading-none">{emoji}</span>
        ) : Icon ? (
          <Icon className="h-5 w-5" />
        ) : null}
        {badge && badge > 0 ? (
          <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span className="flex-1">{label}</span>
      {isActive && (
        <span className="h-2 w-2 rounded-full bg-[#FF9F43]" />
      )}
    </Link>
  );
}

// ── MobileSidebar ──────────────────────────────────────────────────────────────

type Props = {
  user: MobileSidebarUser | null;
};

export function MobileSidebar({ user }: Props) {
  const { mobileOpen, closeMobile } = useSidebar();
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadMessages      = useUnreadMessagesCount();
  const unreadNotifications = useUnreadNotificationsCount();

  // Close on route change
  useEffect(() => {
    closeMobile();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Swipe-to-close (swipe left = close in RTL context, which means decreasing clientX)
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const delta = touch.clientX - touchStartX.current;
    // Swiping left (negative delta) closes the left-side panel
    if (delta < -60) closeMobile();
  };

  async function handleLogout() {
    closeMobile();
    await fetch('/logout', { method: 'POST', redirect: 'manual' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden transition-all duration-300',
        mobileOpen ? 'visible' : 'invisible pointer-events-none',
      )}
    >
      {/* Backdrop overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0',
        )}
        onClick={closeMobile}
      />

      {/* Drawer panel — slides from physical LEFT */}
      <div
        ref={panelRef}
        dir="rtl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={cn(
          'absolute bottom-0 left-0 top-0 w-80 max-w-[85vw] overflow-y-auto',
          'bg-background shadow-2xl',
          'transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="brand-gradient-text text-base font-bold">
            Chof Khdemti
          </span>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="إغلاق القائمة"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User profile */}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            onClick={closeMobile}
            className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-accent"
          >
            <UserAvatar user={user} size="md" linkable={false} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </Link>
        )}

        <div className="p-3 space-y-0.5">

          {/* ── Main navigation ── */}
          <NavItem href="/"              icon={Home}          label={t('home')}          onClick={closeMobile} />
          {user && (
            <>
              <NavItem href="/messages"      icon={MessageCircle} label={t('messages')}      badge={unreadMessages}      onClick={closeMobile} />
              <NavItem href="/notifications" icon={Bell}          label={t('notifications')} badge={unreadNotifications} onClick={closeMobile} />
            </>
          )}
          <NavItem href="/explore" icon={Users} label={t('explore')} onClick={closeMobile} />
          {user && (
            <NavItem href="/saved" icon={Bookmark} label={t('savedPosts')} onClick={closeMobile} />
          )}

          {user && (
            <>
              <div className="my-3 h-px bg-border" />
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                الحساب
              </p>
              <NavItem href="/settings"              icon={Settings}   label={t('settings')}     onClick={closeMobile} />
              <NavItem href="/settings/subscription" icon={CreditCard} label={t('subscription')} onClick={closeMobile} />
            </>
          )}

          <div className="my-3 h-px bg-border" />

          {/* ── Craft categories ── */}
          <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            التخصصات
          </p>
          {CRAFTS.map((c) => (
            <NavItem
              key={c.label}
              href={`/explore?craft=${encodeURIComponent(c.label)}`}
              emoji={c.emoji}
              label={c.label}
              onClick={closeMobile}
            />
          ))}

          {/* ── Guest CTAs ── */}
          {!user && (
            <>
              <div className="my-4 h-px bg-border" />
              <Link
                href="/login"
                onClick={closeMobile}
                className="brand-gradient-bg block w-full rounded-xl py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('login')}
              </Link>
              <Link
                href="/signup"
                onClick={closeMobile}
                className="mt-2 block w-full rounded-xl border py-3 text-center text-sm font-semibold transition-colors hover:bg-accent"
              >
                {t('signup')}
              </Link>
            </>
          )}

          {/* ── Logout ── */}
          {user && (
            <>
              <div className="my-3 h-px bg-border" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span>{t('logout')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
