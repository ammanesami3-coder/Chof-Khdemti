import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md';

// Circular badge sizes — keep compact so it sits inline next to a name.
const circleMap: Record<Size, string> = {
  xs: 'size-[15px]',
  sm: 'size-[18px]',
  md: 'size-5',
};

const iconMap: Record<Size, string> = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
};

type Props = {
  size?: Size;
  className?: string;
  /** Tooltip / accessible label (defaults to Arabic "subscribed artisan"). */
  title?: string;
};

/**
 * Gradient check-mark badge shown next to a subscribed artisan's name.
 * Presentational only (no hooks) so it works in both server and client trees.
 */
export function SubscribedBadge({ size = 'sm', className, title = 'حرفي مشترك' }: Props) {
  return (
    <span
      role="img"
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-white',
        circleMap[size],
        className,
      )}
      style={{ background: 'var(--brand-gradient)' }}
    >
      <Check className={cn(iconMap[size], 'stroke-[3.5]')} aria-hidden="true" />
    </span>
  );
}
