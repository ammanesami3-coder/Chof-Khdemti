import { createClient } from '@/lib/supabase/server';
import { TrendingWidget, type TrendingEntry } from './trending-widget';
import { SuggestedArtisans, type SuggestedArtisan } from './suggested-artisans';

// ── Types ──────────────────────────────────────────────────────────────────────

type ArtisanRow = {
  id: string;
  username: string;
  full_name: string;
  profiles: { avatar_url: string | null; craft_category: string | null; city: string | null } | null;
};

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getTopArtisans(currentUserId?: string): Promise<ArtisanRow[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('users')
    .select('id, username, full_name, profiles(avatar_url, craft_category, city)')
    .eq('account_type', 'artisan')
    .limit(5);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    username: string;
    full_name: string;
    profiles: ArtisanRow['profiles'] | ArtisanRow['profiles'][];
  }>;

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    full_name: r.full_name,
    profiles: Array.isArray(r.profiles) ? (r.profiles[0] ?? null) : r.profiles,
  }));
}

async function getTrendingData(): Promise<TrendingEntry[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_trending_professions', { p_limit: 8 });
  if (error || !data) return [];
  return data as unknown as TrendingEntry[];
}

// ── RightSidebar ───────────────────────────────────────────────────────────────

type Props = { currentUserId?: string };

export async function RightSidebar({ currentUserId }: Props) {
  const [artisans, trendingData] = await Promise.all([
    getTopArtisans(currentUserId),
    getTrendingData(),
  ]);

  // Resolve which of the suggested artisans are subscribed (active trial / paid).
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscribedIds } = await (supabase as any).rpc('get_subscribed_user_ids', {
    p_user_ids: artisans.map((a) => a.id),
  }) as { data: string[] | null };
  const subscribedSet = new Set<string>(subscribedIds ?? []);

  const suggestedArtisans: SuggestedArtisan[] = artisans.map((a) => ({
    id: a.id,
    username: a.username,
    full_name: a.full_name,
    craft_category: a.profiles?.craft_category ?? null,
    city: a.profiles?.city ?? null,
    avatar_url: a.profiles?.avatar_url ?? null,
    is_subscribed: subscribedSet.has(a.id),
  }));

  return (
    <aside
      dir="rtl"
      className="hidden xl:flex h-full w-[284px] shrink-0 flex-col overflow-y-auto pb-6 sidebar-scroll"
    >
      <div className="space-y-5 p-3">

        {/* ── Suggested artisans + tip (client component for translations) ── */}
        <SuggestedArtisans artisans={suggestedArtisans} />

        <div className="h-px bg-border" />

        {/* ── Trending categories (ديناميكي + auto-refresh) ── */}
        <TrendingWidget initialData={trendingData} />

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40">
          Chof Khdemti © 2025
        </p>
      </div>
    </aside>
  );
}
