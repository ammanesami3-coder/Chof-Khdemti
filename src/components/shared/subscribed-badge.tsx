import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md';

const sizeMap: Record<Size, string> = {
  xs: 'gap-0.5 px-1.5 py-0 text-[10px]',
  sm: 'gap-1 px-2 py-0.5 text-xs',
  md: 'gap-1 px-2.5 py-0.5 text-sm',
};

const iconMap: Record<Size, string> = {
  xs: 'size-2.5',
  sm: 'size-3',
  md: 'size-3.5',
};

type Props = {
  size?: Size;
  className?: string;
};

export function SubscribedBadge({ size = 'sm', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-medium',
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        sizeMap[size],
        className,
      )}
      title="حرفي مشترك"
    >
      <Sparkles className={iconMap[size]} />
      موثوق
    </span>
  );
}
