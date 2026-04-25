import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StarRating } from './star-rating';

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
  const wasEdited = created_at !== updated_at;
  const displayDate = wasEdited ? updated_at : created_at;

  const initials = customer.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-2.5 border-b py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar>
            {customer.avatar_url && <AvatarImage src={customer.avatar_url} alt={customer.full_name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
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
        {formatDistanceToNow(new Date(displayDate), { locale: ar, addSuffix: true })}
        {wasEdited && ' · معدَّل'}
      </p>
    </div>
  );
}
