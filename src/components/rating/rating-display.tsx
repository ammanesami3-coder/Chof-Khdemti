import { StarRating } from './star-rating';

interface RatingDisplayProps {
  avgStars: number | null;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingDisplay({ avgStars, totalCount, size = 'sm' }: RatingDisplayProps) {
  if (totalCount === 0 || avgStars === null) {
    return <span className="text-sm text-muted-foreground">لا يوجد تقييمات بعد</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5" dir="ltr">
      <StarRating value={avgStars} readonly size={size} />
      <span className="text-sm text-muted-foreground tabular-nums" dir="rtl">
        {avgStars.toFixed(1)} ({totalCount} تقييم)
      </span>
    </div>
  );
}
