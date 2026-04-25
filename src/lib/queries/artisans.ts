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

  return (data as unknown as RawArtisan[]).map(mapArtisan);
}
