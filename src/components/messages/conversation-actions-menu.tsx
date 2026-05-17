'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pin, PinOff, BellOff, Bell, CheckCheck, Trash2, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';
import {
  pinConversation,
  unpinConversation,
  muteConversation,
  unmuteConversation,
  markConversationAsRead,
  deleteConversationForMe,
  type MuteDuration,
} from '@/lib/actions/conversation-settings';
import type { ConversationRow } from '@/lib/queries/conversations';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMutedNow(conv: ConversationRow): boolean {
  if (!conv.is_muted) return false;
  if (!conv.muted_until) return true; // muted forever
  return new Date(conv.muted_until) > new Date();
}

// ── Shared action list ────────────────────────────────────────────────────────

type ActionListProps = {
  conv: ConversationRow;
  onAction: (fn: () => Promise<{ error?: string }>, patch: Partial<ConversationRow & { _delete?: boolean }>) => void;
  onClose: () => void;
  compact?: boolean;
};

function ActionList({ conv, onAction, onClose, compact }: ActionListProps) {
  const { t } = useLang();
  const [muteStep, setMuteStep] = useState(false);
  const pinned = conv.is_pinned;
  const muted  = isMutedNow(conv);

  const DURATIONS: Array<{ key: MuteDuration; labelKey: 'mute1h' | 'mute8h' | 'mute24h' | 'muteForever' }> = [
    { key: '1h',      labelKey: 'mute1h' },
    { key: '8h',      labelKey: 'mute8h' },
    { key: '24h',     labelKey: 'mute24h' },
    { key: 'forever', labelKey: 'muteForever' },
  ];

  const handleMuteClick = () => {
    if (muted) {
      onAction(() => unmuteConversation(conv.id), { is_muted: false, muted_until: null });
    } else {
      setMuteStep(true);
    }
  };

  const handleDuration = (key: MuteDuration) => {
    const hours = key === '1h' ? 1 : key === '8h' ? 8 : key === '24h' ? 24 : null;
    const muted_until = hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
    onAction(() => muteConversation(conv.id, key), { is_muted: true, muted_until });
  };

  const btn = compact
    ? 'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent rounded-lg outline-none'
    : 'flex items-center gap-3 w-full px-4 py-3.5 text-sm transition-colors hover:bg-accent focus-visible:bg-accent outline-none';

  if (muteStep) {
    return (
      <>
        <button
          onClick={() => setMuteStep(false)}
          className={cn(btn, 'text-muted-foreground')}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          {t('cancel')}
        </button>
        {DURATIONS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => handleDuration(key)}
            className={btn}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t(labelKey)}
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {/* Pin / Unpin */}
      <button
        onClick={() => onAction(
          pinned ? () => unpinConversation(conv.id) : () => pinConversation(conv.id),
          pinned
            ? { is_pinned: false, pinned_at: null }
            : { is_pinned: true,  pinned_at: new Date().toISOString() },
        )}
        className={btn}
      >
        {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        {pinned ? t('unpinConversation') : t('pinConversation')}
      </button>

      {/* Mute */}
      <button onClick={handleMuteClick} className={btn}>
        {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {muted ? t('unmuteConversation') : t('muteConversation')}
        {!muted && <ChevronRight className="h-3.5 w-3.5 ms-auto text-muted-foreground" />}
      </button>

      {/* Mark as read — only when there are unread */}
      {conv.unread_count > 0 && (
        <button
          onClick={() => onAction(
            () => markConversationAsRead(conv.id),
            { unread_count: 0 },
          )}
          className={btn}
        >
          <CheckCheck className="h-4 w-4" />
          {t('markAsRead')}
        </button>
      )}

      {/* Separator before destructive */}
      <div className="my-1 h-px bg-border" />

      {/* Delete */}
      <button
        onClick={() => {
          onAction(
            () => deleteConversationForMe(conv.id),
            { _delete: true } as Partial<ConversationRow & { _delete?: boolean }>,
          );
          onClose();
        }}
        className={cn(btn, 'text-destructive')}
      >
        <Trash2 className="h-4 w-4" />
        {t('deleteConversation')}
      </button>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type MenuTrigger =
  | { type: 'context'; position: { x: number; y: number } }
  | { type: 'sheet' };

type Props = {
  conv:              ConversationRow;
  trigger:           MenuTrigger | null;
  onClose:           () => void;
  onOptimisticUpdate: (id: string, patch: Partial<ConversationRow & { _delete?: boolean }>) => void;
};

const MENU_W = 230;

export function ConversationActionsMenu({ conv, trigger, onClose, onOptimisticUpdate }: Props) {
  const { t } = useLang();
  const [, startTransition] = useTransition();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Close menu on Escape
  useEffect(() => {
    if (!trigger) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [trigger, onClose]);

  const handleAction = useCallback(
    (fn: () => Promise<{ error?: string }>, patch: Partial<ConversationRow & { _delete?: boolean }>) => {
      onOptimisticUpdate(conv.id, patch);
      onClose();
      startTransition(async () => {
        const res = await fn();
        if (res.error) toast.error(t('genericError'));
      });
    },
    [t, conv.id, onOptimisticUpdate, onClose],
  );

  if (!trigger) return null;

  // ── Mobile bottom sheet ────────────────────────────────────────────────────
  if (trigger.type === 'sheet') {
    return (
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl pb-safe-or-6"
        >
          <SheetHeader className="border-b pb-3">
            <SheetTitle className="text-sm truncate text-start">
              {conv.partner_full_name}
            </SheetTitle>
          </SheetHeader>
          <div className="pt-1">
            <ActionList conv={conv} onAction={handleAction} onClose={onClose} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ── Desktop context menu (portal) ─────────────────────────────────────────
  if (typeof window === 'undefined') return null;

  const { position } = trigger;
  const MENU_MIN_H = 180;

  // Clamp so the menu never leaves the viewport
  const cx = Math.min(position.x, window.innerWidth  - MENU_W  - 8);
  const cy = Math.min(position.y, window.innerHeight - MENU_MIN_H - 8);

  return createPortal(
    <>
      {/* Invisible backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        onMouseDown={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        aria-hidden
      />
      {/* Menu box */}
      <div
        role="menu"
        aria-label={t('conversationOptionsAriaLabel')}
        className={cn(
          'fixed z-[61] rounded-xl border bg-popover text-popover-foreground shadow-xl py-1.5 overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 duration-150 origin-top-start',
        )}
        style={{ top: cy, left: cx, minWidth: MENU_W }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b mb-1">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {conv.partner_full_name}
          </p>
        </div>
        <div className="px-1">
          <ActionList conv={conv} onAction={handleAction} onClose={onClose} compact />
        </div>
      </div>
    </>,
    document.body,
  );
}
