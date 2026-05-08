'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CornerUpLeft, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'] as const;

const VIEWPORT_GAP  = 12;  // px from screen edge
const REACTIONS_H   = 56;  // estimated height of reactions bar
const ACTIONS_H     = 240; // estimated height of actions list

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActiveMessage = {
  id:                  string;
  isSent:              boolean;
  content:             string | null;
  canDeleteForEveryone:boolean;
  currentEmoji:        string | null;
  anchorRect:          DOMRect;
};

type Props = {
  active:              ActiveMessage;
  onClose:             () => void;
  onReact:             (emoji: string) => void;
  onReply:             () => void;
  onCopy:              () => void;
  onDeleteForMe:       () => void;
  onDeleteForEveryone: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────────

export function MessageActionSheet({
  active,
  onClose,
  onReact,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
}: Props) {
  const [visible, setVisible] = useState(false);
  const firstActionRef        = useRef<HTMLButtonElement>(null);

  // Animate in
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC + browser back close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    const onPop = () => handleClose();
    document.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
    };
  });

  // Focus first action
  useEffect(() => {
    if (visible) firstActionRef.current?.focus();
  }, [visible]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 150);
  }, [onClose]);

  const handleReact = useCallback((emoji: string) => {
    navigator.vibrate?.(10);
    onReact(emoji);
    handleClose();
  }, [onReact, handleClose]);

  // ── Layout calculation ─────────────────────────────────────────────────────
  const { anchorRect, isSent } = active;
  const viewH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewW = typeof window !== 'undefined' ? window.innerWidth  : 390;

  // Is message in bottom half? → put menus ABOVE it
  const isBottomHalf = anchorRect.top > viewH / 2;

  // Reactions bar position
  const reactionsTop = isBottomHalf
    ? anchorRect.top - REACTIONS_H - 8
    : anchorRect.bottom + 8;

  // Actions list position
  const actionsTop = isBottomHalf
    ? anchorRect.top - REACTIONS_H - ACTIONS_H - 16
    : anchorRect.bottom + REACTIONS_H + 16;

  // Horizontal: align to message side, clamp within viewport
  const menuWidth = Math.min(260, viewW - VIEWPORT_GAP * 2);
  let menuLeft = isSent
    ? anchorRect.right - menuWidth
    : anchorRect.left;
  menuLeft = Math.max(VIEWPORT_GAP, Math.min(menuLeft, viewW - menuWidth - VIEWPORT_GAP));

  // Clamp vertical positions
  const clampedActionsTop = Math.max(
    VIEWPORT_GAP,
    Math.min(actionsTop, viewH - ACTIONS_H - VIEWPORT_GAP),
  );
  const clampedReactionsTop = Math.max(
    VIEWPORT_GAP,
    Math.min(reactionsTop, viewH - REACTIONS_H - VIEWPORT_GAP),
  );

  // ── Action items ───────────────────────────────────────────────────────────
  const actions = [
    {
      key:     'reply',
      icon:    <CornerUpLeft className="h-4 w-4" />,
      label:   'رد',
      onClick: () => { onReply(); handleClose(); },
      danger:  false,
      show:    true,
      ref:     firstActionRef,
    },
    {
      key:     'copy',
      icon:    <Copy className="h-4 w-4" />,
      label:   'نسخ',
      onClick: () => { onCopy(); handleClose(); },
      danger:  false,
      show:    !!active.content,
      ref:     null,
    },
    {
      key:     'delete-me',
      icon:    <Trash2 className="h-4 w-4" />,
      label:   'حذف لي فقط',
      onClick: () => { onDeleteForMe(); handleClose(); },
      danger:  true,
      show:    true,
      ref:     null,
    },
    {
      key:     'delete-all',
      icon:    <Trash2 className="h-4 w-4" />,
      label:   'حذف للجميع',
      onClick: () => { onDeleteForEveryone(); handleClose(); },
      danger:  true,
      show:    active.canDeleteForEveryone,
      ref:     null,
    },
  ].filter((a) => a.show);

  // ── Portal render ──────────────────────────────────────────────────────────
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[9990] bg-black/60 transition-opacity duration-150',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Highlighted message ghost — sits above backdrop, exactly over original */}
      <div
        className={cn(
          'fixed z-[9991] pointer-events-none transition-transform duration-200',
          visible ? 'scale-[1.02]' : 'scale-100',
        )}
        style={{
          top:    anchorRect.top,
          left:   anchorRect.left,
          width:  anchorRect.width,
          height: anchorRect.height,
        }}
      />

      {/* Reactions bar */}
      <div
        className={cn(
          'fixed z-[9993] transition-all duration-200',
          visible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-90',
        )}
        style={{
          top:  clampedReactionsTop,
          left: menuLeft,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 rounded-full border bg-background px-2 py-1.5 shadow-xl">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => handleReact(emoji)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-2xl',
                'transition-transform duration-100 active:scale-110',
                active.currentEmoji === emoji && 'bg-primary/10 ring-2 ring-primary/30',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Actions list */}
      <div
        role="menu"
        aria-label="خيارات الرسالة"
        className={cn(
          'fixed z-[9993] overflow-hidden rounded-2xl border bg-background shadow-xl',
          'transition-all duration-200',
          visible
            ? 'opacity-100 translate-y-0'
            : isBottomHalf
              ? 'opacity-0 translate-y-4'
              : 'opacity-0 -translate-y-4',
        )}
        style={{ top: clampedActionsTop, left: menuLeft, width: menuWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action, idx) => (
          <button
            key={action.key}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={action.ref as any}
            type="button"
            role="menuitem"
            aria-label={action.label}
            onClick={action.onClick}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3.5 text-sm',
              'transition-colors hover:bg-accent active:bg-accent/80',
              action.danger ? 'text-destructive' : 'text-foreground',
              idx > 0 && 'border-t border-border/50',
            )}
          >
            <span className="shrink-0">{action.icon}</span>
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
