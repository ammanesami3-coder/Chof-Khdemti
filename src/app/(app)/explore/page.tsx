import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ExploreClient } from '@/components/explore/explore-client';
import { ArtisanGridSkeleton } from '@/components/explore/artisan-grid';
import { GuestBanner } from '@/components/shared/guest-banner';
import type { ArtisanListItem } from '@/lib/queries/artisans';

export const metadata = { title: 'اكتشف الحرفيين — Chof Khdemti' };

const PAGE_SIZE = 20;

type RpcRow = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_subscribed: boolean;
  craft_category: string | null;
  city: string | null;
  years_experience: number | null;
  avg_rating: number | null;
  ratings_count: number;
};

async function fetchArtisansServer(
  craft: string,
  city: string,
  q: string,
  sort: string,
): Promise<ArtisanListItem[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc('search_artisans', {
    p_craft:  craft,
    p_city:   city,
    p_q:      q,
    p_sort:   sort || 'default',
    p_limit:  PAGE_SIZE,
    p_offset: 0,
  });

  return ((data ?? []) as RpcRow[]).map((r) => ({
    id: r.id,
    username: r.username,
    full_name: r.full_name,
    created_at: r.created_at,
    avatar_url: r.avatar_url,
    is_verified: r.is_verified,
    is_subscribed: r.is_subscribed ?? false,
    craft_category: r.craft_category,
    city: r.city,
    years_experience: r.years_experience,
    avgRating:
      r.avg_rating !== null && r.avg_rating !== undefined
        ? Math.round(Number(r.avg_rating) * 10) / 10
        : null,
    totalRatingsCount: r.ratings_count ?? 0,
  }));
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const craft = (params.craft as string) ?? '';
  const city  = (params.city  as string) ?? '';
  const q     = (params.q     as string) ?? '';
  const sort  = (params.sort  as string) ?? '';

  const [initialArtisans, { data: { user } }] = await Promise.all([
    fetchArtisansServer(craft, city, q, sort),
    createClient().then((sb) => sb.auth.getUser()),
  ]);

  return (
    <>
      {!user && <GuestBanner />}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Suspense fallback={<ArtisanGridSkeleton />}>
          <ExploreClient
            initialArtisans={initialArtisans}
            initialCraft={craft}
            initialCity={city}
            initialQ={q}
            initialSort={sort}
            currentUserId={user?.id ?? null}
          />
        </Suspense>
      </main>
    </>
  );
}
