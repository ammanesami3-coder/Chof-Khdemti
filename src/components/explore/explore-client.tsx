'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArtisanGrid, ArtisanGridSkeleton } from './artisan-grid';
import { ExploreFilters } from './explore-filters';
import { searchArtisans, PAGE_SIZE } from '@/lib/queries/artisans';
import type { ArtisanListItem } from '@/lib/queries/artisans';

type Props = {
  initialArtisans: ArtisanListItem[];
  initialCraft: string;
  initialCity: string;
  initialQ: string;
  currentUserId: string | null;
};

export function ExploreClient({
  initialArtisans,
  initialCraft,
  initialCity,
  initialQ,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const craft = searchParams.get('craft') ?? '';
  const city = searchParams.get('city') ?? '';
  const q = searchParams.get('q') ?? '';
  const hasActiveFilters = !!(craft || city || q);

  // Use server-fetched data only when URL params match what the server used
  const matchesInitial =
    craft === initialCraft && city === initialCity && q === initialQ;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['artisans', craft, city, q],
      queryFn: ({ pageParam }) =>
        searchArtisans({ craft, city, q, page: pageParam as number }),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === PAGE_SIZE ? allPages.length : undefined,
      initialData: matchesInitial
        ? { pages: [initialArtisans], pageParams: [0] }
        : undefined,
      staleTime: 60_000,
    });

  const artisans = data?.pages.flat() ?? [];
  const showSkeleton = isLoading && !matchesInitial;

  return (
    <div className="space-y-6">
      <ExploreFilters />

      {showSkeleton ? (
        <ArtisanGridSkeleton />
      ) : (
        <>
          <ArtisanGrid
            artisans={artisans}
            currentUserId={currentUserId}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => router.push('?', { scroll: false })}
          />

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="min-w-36"
              >
                {isFetchingNextPage ? 'جارٍ التحميل...' : 'تحميل المزيد'}
              </Button>
            </div>
          )}

          {!hasNextPage && artisans.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              عُرضت جميع النتائج ({artisans.length} حرفي)
            </p>
          )}
        </>
      )}
    </div>
  );
}
