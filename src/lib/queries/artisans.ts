import { createClient } from '@/lib/supabase/client';

export const PAGE_SIZE = 20;

export type SearchParams = {
  craft?: string;
  city?: string;
  q?: string;
  page?: number;
};

export type ArtisanListItem = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
  is_verified: boolean;
  /** True when the artisan has an active trial or paid subscription */
  is_subscribed?: boolean;
  craft_category: string | null;
  city: string | null;
  years_experience: number | null;
  avgRating: number | null;
  totalRatingsCount: number;
};

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

function mapArtisan(raw: RawArtisan): ArtisanListItem {
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
}

// ── Client-side version (for TanStack Query) ────────────────────────────────
export async function searchArtisans(params: SearchParams): Promise<ArtisanListItem[]> {
  const supabase = createClient();
  const { craft = '', city = '', q = '', page = 0 } = params;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('users')
    .select(
      `id, username, full_name, created_at,
       profiles(avatar_url, is_verified, craft_category, city, years_experience),
       ratings!ratings_artisan_id_fkey(stars)`
    )
    .eq('account_type', 'artisan')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (craft) query = query.eq('profiles.craft_category', craft);
  if (city) query = query.eq('profiles.city', city);
  if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw error;

  let artisans = (data as unknown as RawArtisan[]).map(mapArtisan);

  if (!artisans.length) return artisans;

  // Exclude artisans who opted out of public discovery. Isolated query —
  // a missing column (migration 0040 not applied) degrades to showing all.
  {
    const { data: visRows } = await supabase
      .from('profiles')
      .select('user_id, profile_visibility')
      .in('user_id', artisans.map((a) => a.id));
    if (visRows) {
      const hidden = new Set(
        visRows
          .filter((r) => ((r.profile_visibility as string | null) ?? 'everyone') !== 'everyone')
          .map((r) => r.user_id),
      );
      artisans = artisans.filter((a) => !hidden.has(a.id));
    }
    if (!artisans.length) return artisans;
  }

  // Fetch subscription status via security-definer RPC (bypasses RLS on subscriptions table)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscribedIds } = await (supabase as any).rpc('get_subscribed_user_ids', {
    p_user_ids: artisans.map((a) => a.id),
  }) as { data: string[] | null };

  const subscribedSet = new Set<string>(subscribedIds ?? []);
  for (const a of artisans) {
    a.is_subscribed = subscribedSet.has(a.id);
  }

  // Subscribed artisans first, then by avgRating desc, then by totalRatingsCount desc
  artisans.sort((a, b) => {
    const subDiff = (b.is_subscribed ? 1 : 0) - (a.is_subscribed ? 1 : 0);
    if (subDiff !== 0) return subDiff;
    const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return b.totalRatingsCount - a.totalRatingsCount;
  });

  return artisans;
}
