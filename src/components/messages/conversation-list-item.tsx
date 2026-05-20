'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MoreHorizontal, Pin, BellOff } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/use-long-press';
import { useLang } from '@/lib/i18n/language-context';
import {
  ConversationActionsMenu,
  type MenuTrigger,
} from './conversation-actions-menu';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = {
  conv:               ConversationRow;
  currentUserId:      string;
  onOptimisticUpdate: (id: string, patch: Partial<ConversationRow & { _delete?: boolean }>) => void;
};

function relativeTime(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: ar });
  } catch {
    return '';
  }
}

function isMutedNow(conv: ConversationRow): boolean {
  if (!conv.is_muted) return false;
  if (!conv.muted_until) return true;
  return new Date(conv.muted_until) > new Date();
}

export function ConversationListItem({ conv, currentUserId, onOptimisticUpdate }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [menuTrigger, setMenuTrigger] = useState<MenuTrigger | null>(null);
  const longPressTriggered = useRef(false);
  const dotsRef = useRef<HTMLButtonElement>(null);

  const {
    id,
    partner_full_name,
    partner_username,
    partner_avatar_url,
    last_message_content,
    last_message_created_at,
    last_message_sender_id,
    last_message_at,
    unread_count,
    is_pinned,
  } = conv;

  const isUnread   = unread_count > 0;
  const isSentByMe = last_message_sender_id === currentUserId;
  const timeStr    = relativeTime(last_message_created_at ?? last_message_at);
  const muted      = isMutedNow(conv);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = useCallback(() => {
    router.push(`/messages/${id}`);
  }, [router, id]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      e.preventDefault();
      longPressTriggered.current = false;
      return;
    }
    navigate();
  }, [navigate]);

  // ── Right-click context menu (desktop) ────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuTrigger({ type: 'context', position: { x: e.clientX, y: e.clientY } });
  }, []);

  // ── Long press (mobile) ───────────────────────────────────────────────────
  const longPress = useLongPress((e: React.TouchEvent) => {
    e.preventDefault();
    longPressTriggered.current = true;
    setMenuTrigger({ type: 'sheet' });
  }, 450);

  // ── Three-dots button ─────────────────────────────────────────────────────
  const handleDotsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = dotsRef.current?.getBoundingClientRect();
    const isTouchOnly = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchOnly || !rect) {
      setMenuTrigger({ type: 'sheet' });
    } else {
      setMenuTrigger({
        type: 'context',
        position: { x: rect.left, y: rect.bottom + 4 },
      });
    }
  }, []);

  const closeMenu = useCallback(() => setMenuTrigger(null), []);

  return (
    <>
      {/* ── List item ────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(); }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        {...longPress}
        className={cn(
          'group relative flex items-center gap-3 px-4 py-3 transition-colors',
          'hover:bg-accent/50 active:bg-accent/70 cursor-pointer select-none',
          isUnread && 'bg-accent/20',
          menuTrigger && 'bg-accent/50',
        )}
      >
        {/* Pinned indicator stripe */}
        {is_pinned && (
          <div className="absolute start-0 top-0 h-full w-0.5 rounded-e-full bg-primary/60" />
        )}

        {/* Avatar */}
        <UserAvatar
          user={{ username: partner_username, full_name: partner_full_name, avatar_url: partner_avatar_url }}
          size="lg"
          linkable={false}
          userId={conv.partner_id}
        />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Name + time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'shrink-0 text-xs text-muted-foreground',
                isUnread && 'font-medium text-foreground',
              )}
            >
              {timeStr}
            </span>
            <div className="flex min-w-0 items-center gap-1.5">
              {is_pinned && (
                <Pin className="h-3 w-3 shrink-0 text-primary/70" aria-label={t('pinnedConversationAriaLabel')} />
              )}
              {muted && (
                <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t('mutedConversationAriaLabel')} />
              )}
              <span className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                {partner_full_name}
              </span>
            </div>
          </div>

          {/* Row 2: Last message + unread badge */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {isUnread ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unread_count > 99 ? '99+' : unread_count}
              </span>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <p
              className={cn(
                'truncate text-sm',
                isUnread ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {last_message_content
                ? isSentByMe
                  ? `${t('youLabel')}: ${last_message_content}`
                  : last_message_content
                : `@${partner_username}`}
            </p>
          </div>
        </div>

        {/* Three-dots button — visible on hover (desktop) or always (mobile via opacity) */}
        <button
          ref={dotsRef}
          type="button"
          aria-label={t('conversationOptionsAriaLabel')}
          onClick={handleDotsClick}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'text-muted-foreground transition-all',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            'hover:bg-accent hover:text-foreground',
            // On touch devices always show at lower opacity
            'supports-[not_(hover:hover)]:opacity-40',
            menuTrigger && 'opacity-100',
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* ── Actions menu (context menu or bottom sheet) ───────────────────── */}
      <ConversationActionsMenu
        conv={conv}
        trigger={menuTrigger}
        onClose={closeMenu}
        onOptimisticUpdate={onOptimisticUpdate}
      />
    </>
  );
}
