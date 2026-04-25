import { createClient } from '@/lib/supabase/client';

export type RatingStats = {
  avgStars: number | null;
  totalCount: number;
};

export async function getArtisanRatingStats(artisanId: string): Promise<RatingStats> {
  const supabase = createClient();

  const { data } = await supabase.rpc('get_artisan_rating', {
    p_artisan_id: artisanId,
  });

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.total_count === 0) {
    return { avgStars: null, totalCount: 0 };
  }

  return {
    avgStars: row.avg_stars != null ? Number(row.avg_stars) : null,
    totalCount: row.total_count,
  };
}

export type RatingItem = {
  id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export async function getArtisanRatings(
  artisanId: string,
  cursor?: string,
  limit = 10,
): Promise<{ items: RatingItem[]; nextCursor: string | null }> {
  const supabase = createClient();

  let query = supabase
    .from('ratings')
    .select(
      `id, stars, comment, created_at, updated_at,
       customer:users!ratings_customer_id_fkey(
         username, full_name,
         profile:profiles(avatar_url)
       )`,
    )
    .eq('artisan_id', artisanId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data } = await query;
  const rows = (data ?? []) as Array<{
    id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
    customer: {
      username: string;
      full_name: string;
      profile: { avatar_url: string | null } | { avatar_url: string | null }[] | null;
    } | null;
  }>;

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);

  const mapped: RatingItem[] = items
    .filter((r) => r.customer !== null)
    .map((r) => {
      const profile = r.customer!.profile;
      const avatarUrl = Array.isArray(profile)
        ? (profile[0]?.avatar_url ?? null)
        : (profile?.avatar_url ?? null);
      return {
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        created_at: r.created_at,
        updated_at: r.updated_at,
        customer: {
          username: r.customer!.username,
          full_name: r.customer!.full_name,
          avatar_url: avatarUrl,
        },
      };
    });

  const lastItem = items[items.length - 1];
  return {
    items: mapped,
    nextCursor: hasMore && lastItem ? lastItem.created_at : null,
  };
}
