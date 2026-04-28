import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ExploreClient } from '@/components/explore/explore-client';
import { ArtisanGridSkeleton } from '@/components/explore/artisan-grid';
import { GuestBanner } from '@/components/shared/guest-banner';
import type { SearchParams, ArtisanListItem } from '@/lib/queries/artisans';

export const metadata = { title: 'اكتشف الحرفيين — Chof Khdemti' };

const PAGE_SIZE = 20;

type RawRating = { stars: number };
type RawProfile = {
  avatar_url: string | null;
  is_verified: boolean;
  craft_category: string | null;
  city: string | null;
  years_experience: number | null;
};
type RawArtisan = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
  profiles: RawProfile | null;
  ratings: RawRating[];
};

async function fetchArtisansServer(params: SearchParams): Promise<ArtisanListItem[]> {
  const supabase = await createClient();
  const { craft = '', city = '', q = '' } = params;

  let query = supabase
    .from('users')
    .select(
      `id, username, full_name, created_at,
       profiles(avatar_url, is_verified, craft_category, city, years_experience),
       ratings!ratings_artisan_id_fkey(stars)`
    )
    .eq('account_type', 'artisan')
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (craft) query = query.eq('profiles.craft_category', craft);
  if (city) query = query.eq('profiles.city', city);
  if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);

  const { data } = await query;
  const rows = (data ?? []) as unknown as RawArtisan[];

  return rows.map((raw) => {
    const p = raw.profiles;
    const stars = raw.ratings ?? [];
    const avgRating =
      stars.length > 0
        ? Math.round(
            (stars.reduce((s, r) => s + r.stars, 0) / stars.length) * 10
          ) / 10
        : null;

    return {
      id: raw.id,
      username: raw.username,
      full_name: raw.full_name,
      created_at: raw.created_at,
      avatar_url: p?.avatar_url ?? null,
      is_verified: p?.is_verified ?? false,
      craft_category: p?.craft_category ?? null,
      city: p?.city ?? null,
      years_experience: p?.years_experience ?? null,
      avgRating,
      totalRatingsCount: stars.length,
    };
  });
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const craft = (params.craft as string) ?? '';
  const city = (params.city as string) ?? '';
  const q = (params.q as string) ?? '';

  const [initialArtisans, authResult] = await Promise.all([
    fetchArtisansServer({ craft, city, q }),
    createClient().then((sb) => sb.auth.getUser()),
  ]);

  const authUserId = authResult.data.user?.id ?? null;

  // Fetch current user's account type if needed for follow button
  let currentUserId: string | null = null;
  if (authUserId) {
    currentUserId = authUserId;
  }

  return (
    <>
      {!authUserId && <GuestBanner />}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">اكتشف الحرفيين</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ابحث عن الحرفيين والمهنيين في منطقتك
          </p>
        </div>

        <Suspense fallback={<ArtisanGridSkeleton />}>
          <ExploreClient
            initialArtisans={initialArtisans}
            initialCraft={craft}
            initialCity={city}
            initialQ={q}
            currentUserId={currentUserId}
          />
        </Suspense>
      </main>
    </>
  );
}
