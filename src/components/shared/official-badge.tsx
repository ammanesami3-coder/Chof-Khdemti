import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md';

// Distinct from the green is_verified check and the gradient SubscribedBadge:
// the official platform badge is a solid brand-blue seal so users instantly
// recognise first-party "Chof Khdemti" content.
const sizeMap: Record<Size, string> = {
  xs: 'size-4',
  sm: 'size-[18px]',
  md: 'size-5',
};

type Props = {
  size?: Size;
  className?: string;
  /** Tooltip / accessible label. */
  title?: string;
};

/**
 * Official platform account badge. Presentational only (no hooks) so it works
 * in both server and client component trees.
 */
export function OfficialBadge({
  size = 'sm',
  className,
  title = 'الحساب الرسمي لـ Chof Khdemti',
}: Props) {
  return (
    <BadgeCheck
      role="img"
      aria-label={title}
      className={cn(
        'shrink-0 fill-[#1877F2] text-white',
        sizeMap[size],
        className,
      )}
    >
      <title>{title}</title>
    </BadgeCheck>
  );
}
