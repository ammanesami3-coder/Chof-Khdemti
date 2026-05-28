'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessageCircle, Bell, Users, Bookmark,
  Settings, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useUnreadNotificationsCount } from '@/hooks/use-notifications';
import { useLang } from '@/lib/i18n/language-context';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SidebarUser = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

// ── Craft categories ───────────────────────────────────────────────────────────

const CRAFTS = [
  { emoji: '🪵', label: 'نجارة' },
  { emoji: '⚡', label: 'كهرباء' },
  { emoji: '🎨', label: 'صباغة' },
  { emoji: '🔧', label: 'سباكة' },
  { emoji: '🚗', label: 'ميكانيك' },
  { emoji: '🏗️', label: 'بناء' },
  { emoji: '📱', label: 'إصلاح هواتف' },
  { emoji: '✂️', label: 'خياطة' },
  { emoji: '👨‍🍳', label: 'طبخ' },
  { emoji: '📸', label: 'تصوير' },
];

// ── SidebarLink ────────────────────────────────────────────────────────────────

type LinkProps = {
  href: string;
  icon?: React.ElementType;
  emoji?: string;
  label: string;
  badge?: number;
  exact?: boolean;
};

function SidebarLink({ href, icon: Icon, emoji, label, badge, exact = false }: LinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-all duration-200',
        isActive
          ? 'text-[#FF9F43] dark:text-[#FFBA69] font-semibold'
          : 'text-foreground/70 hover:text-foreground',
      )}
      style={isActive
        ? { background: 'var(--brand-soft-hover)' }
        : undefined
      }
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--brand-soft)';
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
      }}
    >
      {/* Active accent bar */}
      {isActive && (
        <span
          className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full"
          style={{ background: 'var(--brand-gradient)' }}
        />
      )}

      {/* Icon / Emoji */}
      <span className="relative shrink-0">
        {emoji ? (
          <span className="inline-flex h-5 w-5 items-center justify-center text-[17px] leading-none">
            {emoji}
          </span>
        ) : Icon ? (
          <Icon
            className={cn(
              'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
              isActive ? 'text-[#FF9F43] dark:text-[#FFBA69]' : 'text-foreground/60',
            )}
          />
        ) : null}
        {badge && badge > 0 ? (
          <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>

      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {label}
    </p>
  );
}

// ── LeftSidebar ────────────────────────────────────────────────────────────────

export function LeftSidebar({ user }: { user: SidebarUser | null }) {
  const { t } = useLang();
  const unreadMessages      = useUnreadMessagesCount();
  const unreadNotifications = useUnreadNotificationsCount();
  const [showMore, setShowMore] = useState(false);

  const visibleCrafts = showMore ? CRAFTS : CRAFTS.slice(0, 5);

  return (
    <aside
      dir="rtl"
      className="hidden lg:flex h-full w-[284px] shrink-0 flex-col overflow-y-auto border-e bg-background/80 pb-4 sidebar-scroll"
    >
      <div className="flex-1 space-y-0.5 p-3">

        {/* ── User card ── */}
        {user && (
          <Link
            href={`/profile/${user.username}`}
            className="mb-3 flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-accent group"
          >
            <UserAvatar user={user} size="md" linkable={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                {user.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </Link>
        )}

        <div className="mx-2 mb-3 h-px bg-border" />

        {/* ── Main nav ── */}
        <SidebarLink href="/" icon={Home} label={t('home')} exact />
        {user && (
          <>
            <SidebarLink href="/messages"      icon={MessageCircle} label={t('messages')}      badge={unreadMessages} />
            <SidebarLink href="/notifications" icon={Bell}          label={t('notifications')} badge={unreadNotifications} />
          </>
        )}
        <SidebarLink href="/explore" icon={Users} label={t('explore')} />
        {user && (
          <SidebarLink href="/saved" icon={Bookmark} label={t('savedPosts')} />
        )}

        <div className="mx-2 my-3 h-px bg-border" />

        {/* ── Account ── */}
        {user && (
          <>
            <SectionLabel label={t('account')} />
            <SidebarLink href="/settings"              icon={Settings}    label={t('settings')} />
            <SidebarLink href="/settings/subscription" icon={CreditCard}  label={t('subscription')} />
          </>
        )}

        <div className="mx-2 my-3 h-px bg-border" />

        {/* ── Craft categories ── */}
        <SectionLabel label={t('sectionCrafts')} />
        {visibleCrafts.map((c) => (
          <SidebarLink
            key={c.label}
            href={`/explore?craft=${encodeURIComponent(c.label)}`}
            emoji={c.emoji}
            label={c.label}
          />
        ))}

        <button
          type="button"
          onClick={() => setShowMore((p) => !p)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
            {showMore
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </span>
          <span>{showMore ? t('showLess') : t('showMore')}</span>
        </button>
      </div>

      {/* Footer */}
      <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
        Chof Khdemti © 2025
      </p>
    </aside>
  );
}
