'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Plus, MessageCircle, User } from 'lucide-react';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

type Props = { username: string };

// ── Tab item (regular) ────────────────────────────────────────────────────────

function TabItem({
  href,
  active,
  label,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
        'min-h-[44px] transition-colors duration-200',
        active ? 'text-[#FF9F43]' : 'text-muted-foreground hover:text-foreground/80',
      )}
    >
      {active && (
        <span
          className="absolute top-0 h-0.5 w-8 rounded-b-full"
          style={{ background: 'var(--brand-gradient)' }}
        />
      )}
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

// ── Tab item with unread badge ────────────────────────────────────────────────

function TabItemWithBadge({
  href,
  active,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ElementType;
  badge: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
        'min-h-[44px] transition-colors duration-200',
        active ? 'text-[#FF9F43]' : 'text-muted-foreground hover:text-foreground/80',
      )}
    >
      {active && (
        <span
          className="absolute top-0 h-0.5 w-8 rounded-b-full"
          style={{ background: 'var(--brand-gradient)' }}
        />
      )}
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badge > 0 && (
          <span
            className="absolute -top-1.5 -end-1.5 flex min-w-[17px] h-[17px] items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-background"
            style={{ background: 'var(--brand-gradient)' }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

// ── MobileBottomNav ───────────────────────────────────────────────────────────

export function MobileBottomNav({ username }: Props) {
  const pathname = usePathname();
  const unreadCount = useUnreadMessagesCount();
  const { t } = useLang();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14 items-center">

        <TabItem href="/" active={isActive('/')} label={t('home')} icon={Home} />

        <TabItem href="/explore" active={isActive('/explore')} label={t('explore')} icon={Users} />

        {/* FAB — زر النشر المركزي (مخفي داخل صفحات الرسائل) */}
        {!pathname.startsWith('/messages') && (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label={t('post')}
              onClick={() => window.dispatchEvent(new CustomEvent('compose:open'))}
              className="flex h-12 w-12 -translate-y-3.5 items-center justify-center rounded-full text-white transition-transform duration-200 active:scale-90"
              style={{
                background: 'var(--brand-gradient)',
                boxShadow: '0 4px 20px rgba(255, 159, 67, 0.50)',
                border: '3px solid var(--background)',
              }}
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        )}

        <TabItemWithBadge
          href="/messages"
          active={isActive('/messages')}
          label={t('messages')}
          icon={MessageCircle}
          badge={unreadCount}
        />

        <TabItem
          href={`/profile/${username}`}
          active={isActive(`/profile/${username}`)}
          label={t('myProfile')}
          icon={User}
        />

      </div>
    </nav>
  );
}
