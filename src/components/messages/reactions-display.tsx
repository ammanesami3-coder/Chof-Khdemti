'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/components/messages/chat-window';

type Props = {
  reactions:      MessageReaction[];
  currentUserId:  string;
  isSent:         boolean;
};

export function ReactionsDisplay({ reactions, currentUserId, isSent }: Props) {
  const [open, setOpen] = useState(false);

  if (reactions.length === 0) return null;

  // Collect unique emojis + total count
  const emojiMap = new Map<string, number>();
  for (const r of reactions) {
    emojiMap.set(r.emoji, (emojiMap.get(r.emoji) ?? 0) + 1);
  }
  const topEmojis = [...emojiMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  const myReaction = reactions.find((r) => r.user_id === currentUserId)?.emoji ?? null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={cn(
          'mt-0.5 flex items-center gap-0.5 self-start rounded-full border px-1.5 py-0.5 text-xs',
          'bg-background shadow-sm transition-colors hover:bg-accent',
          isSent ? 'self-end' : 'self-start',
          myReaction && 'border-primary/40 bg-primary/5',
        )}
        aria-label="عرض التفاعلات"
      >
        <span>{topEmojis.join('')}</span>
        <span className="tabular-nums text-muted-foreground">{reactions.length}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogTitle className="text-sm font-semibold">التفاعلات</DialogTitle>
          <div className="max-h-64 overflow-y-auto divide-y">
            {reactions.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-1">
                <span className="text-sm text-muted-foreground">
                  {r.user_id === currentUserId ? 'أنت' : r.user_id.slice(0, 8) + '…'}
                </span>
                <span className="text-lg">{r.emoji}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
