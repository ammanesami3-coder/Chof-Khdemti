import { createClient } from '@/lib/supabase/client';

export const PAGE_SIZE = 20;

export type SearchParams = {
  craft?: string;
  city?: string;
  q?: string;
  sort?: string;
  page?: number;
};

export type ArtisanListItem = {
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
  avgRating: number | null;
  totalRatingsCount: number;
};

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

function mapRow(r: RpcRow): ArtisanListItem {
  return {
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
  };
}

// ── Client-side version (for TanStack Query) ────────────────────────────────
// Uses the search_artisans RPC — a single query with proper INNER JOIN
// filtering, visibility check, ratings aggregation, and subscription status.
export async function searchArtisans(params: SearchParams): Promise<ArtisanListItem[]> {
  const supabase = createClient();
  const { craft = '', city = '', q = '', sort = 'default', page = 0 } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('search_artisans', {
    p_craft:  craft,
    p_city:   city,
    p_q:      q,
    p_sort:   sort || 'default',
    p_limit:  PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
  });

  if (error) throw error;
  return ((data ?? []) as RpcRow[]).map(mapRow);
}
