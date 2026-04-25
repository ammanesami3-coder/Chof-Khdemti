'use client';

import { Star, StarHalf } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type StarType = 'full' | 'half' | 'empty';

export interface StarRatingProps {
  value: number;
  onChange?: (stars: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const SIZE_PX = { sm: 16, md: 20, lg: 28 } as const;

function resolveStarType(position: number, displayValue: number): StarType {
  if (displayValue >= position) return 'full';
  if (displayValue >= position - 0.5) return 'half';
  return 'empty';
}

function StarIcon({ type, px, hover }: { type: StarType; px: number; hover: boolean }) {
  if (type === 'full') {
    return (
      <Star
        width={px}
        height={px}
        className={hover ? 'text-amber-500 fill-amber-500' : 'text-amber-400 fill-amber-400'}
      />
    );
  }
  if (type === 'half') {
    return <StarHalf width={px} height={px} className="text-amber-400 fill-amber-400" />;
  }
  return <Star width={px} height={px} className="text-gray-300" />;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const px = SIZE_PX[size];
  const isInteractive = !readonly && !!onChange;

  // When hovering in interactive mode show integer (full stars only)
  // Otherwise show the actual value (supports halves for decimal averages)
  const displayValue = isInteractive && hoverValue > 0 ? hoverValue : value;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!isInteractive) return;
    const current = Math.round(value) || 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange?.(Math.min(5, current + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange?.(Math.max(1, current - 1));
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        dir="ltr"
        role={isInteractive ? 'radiogroup' : undefined}
        aria-label={`تقييم ${value} من 5`}
        tabIndex={isInteractive ? 0 : undefined}
        className={cn(
          'inline-flex items-center gap-0.5 focus:outline-none',
          isInteractive && 'focus-visible:ring-2 focus-visible:ring-amber-400 rounded-sm',
        )}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => isInteractive && setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const type = resolveStarType(i, displayValue);
          // Amber-500 for all stars up to and including the hovered star
          const isHovered = isInteractive && hoverValue >= i;

          if (isInteractive) {
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={value === i}
                aria-label={`${i} نجوم`}
                tabIndex={-1}
                className="cursor-pointer focus:outline-none"
                onMouseEnter={() => setHoverValue(i)}
                onClick={() => onChange?.(i)}
              >
                <StarIcon type={type} px={px} hover={isHovered} />
              </button>
            );
          }

          return (
            <span key={i} aria-hidden="true">
              <StarIcon type={type} px={px} hover={false} />
            </span>
          );
        })}
      </div>

      {showValue && (
        <span className="text-sm text-muted-foreground tabular-nums leading-none">
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
}
