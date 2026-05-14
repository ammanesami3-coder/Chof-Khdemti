'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/components/messages/chat-window';

type Partner = {
  id:         string;
  full_name:  string;
  avatar_url: string | null;
};

type Props = {
  reactions:            MessageReaction[];
  currentUserId:        string;
  currentUserAvatarUrl: string | null;
  isSent:               boolean;
  partner:              Partner;
  onToggle:             (emoji: string) => void;
};

// ── Small avatar helper ────────────────────────────────────────────────────────

function MiniAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ── ReactionsDisplay ──────────────────────────────────────────────────────────

export function ReactionsDisplay({
  reactions,
  currentUserId,
  currentUserAvatarUrl,
  isSent,
  partner,
  onToggle,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const badgeRef                = useRef<HTMLButtonElement>(null);

  // Group reactions by emoji, sorted by count desc
  const emojiGroups = new Map<string, MessageReaction[]>();
  for (const r of reactions) {
    const arr = emojiGroups.get(r.emoji) ?? [];
    arr.push(r);
    emojiGroups.set(r.emoji, arr);
  }
  const topEmojis = [...emojiGroups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([e]) => e);

  const myEmoji = reactions.find((r) => r.user_id === currentUserId)?.emoji ?? null;

  // Calculate panel position anchored to the badge
  const openPanel = useCallback(() => {
    const el = badgeRef.current;
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const viewH  = window.innerHeight;
    const viewW  = window.innerWidth;
    const PANEL_W = 260;
    const PANEL_H = Math.min(reactions.length * 58 + 52, 300);

    const s: React.CSSProperties = { position: 'fixed', zIndex: 9999, width: PANEL_W };

    // Prefer above, fall back to below
    if (rect.top > PANEL_H + 12) {
      s.bottom = viewH - rect.top + 8;
    } else {
      s.top = rect.bottom + 8;
    }

    // RTL layout: sent messages are on the LEFT, received are on the RIGHT.
    // Panel opens on the opposite side so it stays near the bubble.
    if (isSent) {
      // Sent (LEFT side) → panel extends rightward from the badge
      s.left = Math.max(8, rect.left);
      // Clamp so panel doesn't overflow the right edge
      if (rect.left + PANEL_W > viewW - 8) {
        s.left = Math.max(8, viewW - PANEL_W - 8);
      }
    } else {
      // Received (RIGHT side) → panel extends leftward from the badge
      s.right = Math.max(8, viewW - rect.right);
      // Clamp so panel doesn't overflow the left edge
      if (viewW - (viewW - rect.right) - PANEL_W < 8) {
        s.right = Math.max(8, viewW - PANEL_W - 8);
      }
    }

    setPanelStyle(s);
    setOpen(true);
  }, [isSent, reactions.length]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (reactions.length === 0) return null;

  const panel = open && typeof document !== 'undefined' && createPortal(
    <>
      {/* Backdrop — transparent, just catches clicks */}
      <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

      {/* Floating panel */}
      <div
        style={panelStyle}
        className={cn(
          'z-[9999] overflow-hidden rounded-2xl border bg-popover shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-150',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">التفاعلات</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Reaction rows */}
        <div
          className={cn(
            'divide-y divide-border/50',
            'max-h-[256px] overflow-y-auto',
            '[&::-webkit-scrollbar]:w-1',
            '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60',
            '[&::-webkit-scrollbar-track]:bg-transparent',
          )}
        >
          {reactions.map((r, idx) => {
            const isMe = r.user_id === currentUserId;
            const name = isMe ? 'أنت' : partner.full_name;
            const src  = isMe ? currentUserAvatarUrl : partner.avatar_url;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isMe}
                onClick={() => {
                  if (!isMe) return;
                  onToggle(r.emoji);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-start',
                  'transition-colors duration-100',
                  isMe
                    ? 'cursor-pointer hover:bg-destructive/10 active:bg-destructive/15'
                    : 'cursor-default',
                )}
              >
                {/* Avatar */}
                <MiniAvatar name={name} src={src} />

                {/* Name + hint */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-foreground">
                    {name}
                  </p>
                  {isMe && (
                    <p className="mt-0.5 text-[11px] leading-none text-destructive/60">
                      اضغط للإزالة
                    </p>
                  )}
                </div>

                {/* Emoji */}
                <span className="shrink-0 text-xl leading-none">{r.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );

  return (
    <>
      {/* Badge */}
      <button
        ref={badgeRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); openPanel(); }}
        className={cn(
          'mt-0.5 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs',
          'bg-background shadow-sm',
          'transition-all duration-150 hover:scale-110 active:scale-95',
          isSent ? 'self-end' : 'self-start',
          myEmoji ? 'border-primary/40 bg-primary/5' : 'border-border/60',
        )}
        aria-label="عرض التفاعلات"
      >
        <span className="leading-none">{topEmojis.join('')}</span>
        {reactions.length > 1 && (
          <span className="ms-0.5 tabular-nums text-muted-foreground">{reactions.length}</span>
        )}
      </button>
      {panel}
    </>
  );
}
