'use client';

import { cn } from '@/lib/utils';

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'] as const;

type Props = {
  onSelect: (emoji: string) => void;
  currentEmoji?: string | null;
  className?: string;
};

export function EmojiPicker({ onSelect, currentEmoji, className }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-1 shadow-lg',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-base',
            'transition-transform hover:scale-125 active:scale-110',
            currentEmoji === emoji && 'bg-primary/10 ring-1 ring-primary/30',
          )}
          aria-label={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
