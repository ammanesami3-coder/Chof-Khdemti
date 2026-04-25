import { ArtisanCardSkeleton } from './artisan-card-skeleton';

export function ExploreGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <ArtisanCardSkeleton key={i} />
      ))}
    </div>
  );
}
