'use client';

import { getReaction, getTopReactions, type Reaction } from '@/lib/constants/reactions';
import { cn } from '@/lib/utils';

interface ReactionsSummaryProps {
  summary: Record<string, number> | null | undefined;
  totalCount: number;
  /** User's own reaction — used as a stable fallback when summary is empty
   *  (prevents flicker before reactions_summary has propagated). */
  fallbackReaction?: string | null;
  onClick?: () => void;
  /** Warm the reactor list + modal chunk before the click lands (hover/focus). */
  onPrefetch?: () => void;
  className?: string;
  /** Visual sizing — 'sm' for comments, 'md' for posts (default) */
  size?: 'sm' | 'md';
  /** Whether to render the total count next to the emojis (default true) */
  showCount?: boolean;
}

export function ReactionsSummary({
  summary,
  totalCount,
  fallbackReaction,
  onClick,
  onPrefetch,
  className,
  size = 'md',
  showCount = true,
}: ReactionsSummaryProps) {
  if (!totalCount) return null;

  // Resolve top reactions — fall back to the user's own reaction so the badge
  // remains stable across refetches even if reactions_summary hasn't synced yet.
  let topReactions: Reaction[] = getTopReactions(summary, 3);
  if (topReactions.length === 0) {
    const fallback = fallbackReaction ? getReaction(fallbackReaction) : null;
    if (fallback) topReactions = [fallback];
  }

  const emojiSize = size === 'sm' ? 'size-[16px] text-[11px]' : 'size-[20px] text-[13px]';
  const textSize  = size === 'sm' ? 'text-xs' : 'text-sm';
  const overlap   = size === 'sm' ? '-ms-1' : '-ms-1.5';

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      disabled={!onClick}
      aria-label={`${totalCount}`}
      className={cn(
        'flex items-center gap-1.5',
        textSize,
        'text-muted-foreground',
        onClick
          ? 'cursor-pointer transition-colors hover:text-foreground hover:underline'
          : 'pointer-events-none cursor-default',
        className,
      )}
    >
      {/* Stacked emoji badges — each in a ring-bordered circle, Facebook-style */}
      <span className="flex items-center">
        {topReactions.length > 0 ? (
          topReactions.map((r, i) => (
            <span
              key={r.type}
              title={r.label_ar}
              className={cn(
                'inline-flex items-center justify-center rounded-full bg-card leading-none ring-2 ring-card',
                emojiSize,
                i > 0 && overlap,
              )}
            >
              {r.emoji}
            </span>
          ))
        ) : (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full bg-card leading-none ring-2 ring-card',
              emojiSize,
            )}
          >
            👍
          </span>
        )}
      </span>

      {/* Total count — Facebook shows the number next to the stacked emojis */}
      {showCount && (
        <span className="tabular-nums font-medium">{totalCount}</span>
      )}
    </button>
  );
}
