import { StarRating } from './star-rating';

interface RatingDisplayProps {
  avgStars: number | null;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function RatingDisplay({ avgStars, totalCount, size = 'sm', onClick }: RatingDisplayProps) {
  if (totalCount === 0 || avgStars === null) {
    return <span className="text-sm text-muted-foreground">لا يوجد تقييمات بعد</span>;
  }

  const content = (
    <div className="inline-flex items-center gap-1.5" dir="ltr">
      <StarRating value={avgStars} readonly size={size} />
      <span className="text-sm text-muted-foreground tabular-nums" dir="rtl">
        {avgStars.toFixed(1)} ({totalCount} تقييم)
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer rounded transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`عرض ${totalCount} تقييم`}
      >
        {content}
      </button>
    );
  }

  return content;
}
