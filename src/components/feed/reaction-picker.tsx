'use client';

import { REACTIONS } from '@/lib/constants/reactions';
import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  visible: boolean;
  activeReaction?: string | null;
  onReact: (reactionType: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  /**
   * The actual CSS layout direction of the container where this picker lives.
   * Pass 'rtl' when inside main/dir="rtl" (PostCard), or the language dir for portals (CommentsSheet).
   * Defaults to 'rtl' since the app is RTL-first.
   */
  contextDir?: 'rtl' | 'ltr';
}

export function ReactionPicker({
  visible,
  activeReaction,
  onReact,
  onMouseEnter,
  onMouseLeave,
  className,
  contextDir = 'rtl',
}: ReactionPickerProps) {
  const isRtl = contextDir === 'rtl';

  return (
    <div
      role="menu"
      aria-label="اختر تفاعلاً"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'absolute bottom-full mb-2 z-50',
        isRtl ? 'right-0' : 'left-0',
        'flex items-center gap-1 px-3 py-2',
        'rounded-full bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700',
        isRtl ? 'origin-bottom-right' : 'origin-bottom-left',
        visible
          ? 'opacity-100 scale-100 pointer-events-auto transition-all duration-200 ease-out'
          : 'opacity-0 scale-75 pointer-events-none transition-all duration-75 ease-in',
        className,
      )}
    >
      {REACTIONS.map((r) => {
        const isActive = activeReaction === r.type;
        return (
          <button
            key={r.type}
            role="menuitem"
            aria-label={r.label_ar}
            aria-pressed={isActive}
            onClick={(e) => {
              e.stopPropagation();
              onReact(r.type);
            }}
            className={cn(
              'relative flex flex-col items-center group',
              'rounded-full p-1 transition-transform duration-150',
              'hover:scale-125 active:scale-110',
              isActive && 'scale-125',
            )}
          >
            <span className="text-2xl leading-none select-none">{r.emoji}</span>
            {/* Tooltip */}
            <span
              className={cn(
                'absolute -top-8 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
                'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none',
              )}
            >
              {r.label_ar}
            </span>
          </button>
        );
      })}
    </div>
  );
}
