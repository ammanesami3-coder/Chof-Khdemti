import { Skeleton } from '@/components/ui/skeleton';
import { ArtisanCard } from './artisan-card';
import type { ArtisanListItem } from '@/lib/queries/artisans';

type Props = {
  artisans: ArtisanListItem[];
  isLoading?: boolean;
  currentUserId: string | null;
};

export function ArtisanGrid({ artisans, isLoading, currentUserId }: Props) {
  if (isLoading) return <ArtisanGridSkeleton />;

  if (artisans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="mb-3 text-4xl">🔍</span>
        <p className="font-medium">لا توجد نتائج</p>
        <p className="mt-1 text-sm text-muted-foreground">جرّب فلاتر أخرى أو ابحث بكلمة مختلفة</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {artisans.map((artisan) => (
        <ArtisanCard key={artisan.id} artisan={artisan} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

export function ArtisanGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
