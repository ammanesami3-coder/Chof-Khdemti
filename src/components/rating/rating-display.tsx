'use client';

import { StarRating } from './star-rating';
import { useLang } from '@/lib/i18n/language-context';

interface RatingDisplayProps {
  avgStars: number | null;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function RatingDisplay({ avgStars, totalCount, size = 'sm', onClick }: RatingDisplayProps) {
  const { t } = useLang();
  if (totalCount === 0 || avgStars === null) {
    return <span className="text-sm text-muted-foreground">{t('noRatingsYet')}</span>;
  }

  const content = (
    <div className="inline-flex items-center gap-1.5" dir="ltr">
      <StarRating value={avgStars} readonly size={size} />
      <span className="text-sm text-muted-foreground tabular-nums" dir="rtl">
        {avgStars.toFixed(1)} ({totalCount} {t('nRatingsSuffix')})
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer rounded transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${t('viewNRatingsPrefix')} ${totalCount} ${t('nRatingsSuffix')}`}
      >
        {content}
      </button>
    );
  }

  return content;
}
