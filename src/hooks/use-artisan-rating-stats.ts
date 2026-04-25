'use client';

import { useQuery } from '@tanstack/react-query';
import { getArtisanRatingStats } from '@/lib/queries/ratings';
import type { RatingStats } from '@/lib/queries/ratings';

export function useArtisanRatingStats(artisanId: string, initialData?: RatingStats) {
  return useQuery({
    queryKey: ['artisan-rating', artisanId],
    queryFn: () => getArtisanRatingStats(artisanId),
    staleTime: 5 * 60_000,
    ...(initialData != null ? { initialData } : {}),
  });
}
