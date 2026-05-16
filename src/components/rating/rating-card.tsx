'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import { UserAvatar } from '@/components/shared/user-avatar';
import { StarRating } from './star-rating';
import { useLang } from '@/lib/i18n/language-context';

export type RatingCardData = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export function RatingCard({ stars, comment, created_at, updated_at, customer }: RatingCardData) {
  const { t, lang } = useLang();
  const wasEdited = created_at !== updated_at;
  const displayDate = wasEdited ? updated_at : created_at;
  const dateLocale = lang === 'ar' ? ar : lang === 'fr' ? fr : enUS;

  return (
    <div className="space-y-2.5 border-b py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar user={customer} size="sm" />
          <div>
            <p className="text-sm font-medium leading-none">{customer.full_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">@{customer.username}</p>
          </div>
        </div>
        <StarRating value={stars} readonly size="sm" />
      </div>

      {comment && (
        <p className="text-sm leading-relaxed text-foreground/80 pe-2">{comment}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(displayDate), { locale: dateLocale, addSuffix: true })}
        {wasEdited && ` ${t('wasEditedLabel')}`}
      </p>
    </div>
  );
}
