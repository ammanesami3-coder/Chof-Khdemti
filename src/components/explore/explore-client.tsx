'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArtisanGrid, ArtisanGridSkeleton } from './artisan-grid';
import { ExploreFilters } from './explore-filters';
import { searchArtisans, PAGE_SIZE } from '@/lib/queries/artisans';
import { useLang } from '@/lib/i18n/language-context';
import type { ArtisanListItem } from '@/lib/queries/artisans';

type Props = {
  initialArtisans: ArtisanListItem[];
  initialCraft: string;
  initialCity: string;
  initialQ: string;
  initialSort: string;
  currentUserId: string | null;
};

export function ExploreClient({
  initialArtisans,
  initialCraft,
  initialCity,
  initialQ,
  initialSort,
  currentUserId,
}: Props) {
  const router = useRouter();
  const { t } = useLang();
  const searchParams = useSearchParams();

  const craft = searchParams.get('craft') ?? '';
  const city  = searchParams.get('city')  ?? '';
  const q     = searchParams.get('q')     ?? '';
  const sort  = searchParams.get('sort')  ?? '';

  const hasActiveFilters = !!(craft || city || q);

  // Reuse server-rendered data when URL params match what the server used
  const matchesInitial =
    craft === initialCraft &&
    city  === initialCity  &&
    q     === initialQ     &&
    sort  === initialSort;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['artisans', craft, city, q, sort],
      queryFn: ({ pageParam }) =>
        searchArtisans({ craft, city, q, sort: sort || 'default', page: pageParam as number }),
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
    <div className="space-y-4">
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
                {isFetchingNextPage ? t('loading') : t('loadMoreLabel')}
              </Button>
            </div>
          )}

          {!hasNextPage && artisans.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {t('allResultsShown').replace('{count}', String(artisans.length))}
            </p>
          )}
        </>
      )}
    </div>
  );
}
