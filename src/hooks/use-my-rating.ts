'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Rating } from '@/lib/validations/rating';

async function fetchMyRating(artisanId: string): Promise<Rating | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('ratings')
    .select('id, artisan_id, customer_id, stars, comment, created_at, updated_at')
    .eq('artisan_id', artisanId)
    .eq('customer_id', user.id)
    .maybeSingle();

  return (data as Rating | null) ?? null;
}

export function useMyRating(artisanId: string, initialData?: Rating | null) {
  return useQuery({
    queryKey: ['my-rating', artisanId],
    queryFn: () => fetchMyRating(artisanId),
    staleTime: 60_000,
    ...(initialData != null ? { initialData } : {}),
  });
}
