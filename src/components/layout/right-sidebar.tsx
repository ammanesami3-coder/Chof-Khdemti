import { createClient } from '@/lib/supabase/server';
import { TrendingWidget, type TrendingEntry } from './trending-widget';
import { SuggestedArtisans, type SuggestedArtisan } from './suggested-artisans';

// ── Data fetching ──────────────────────────────────────────────────────────────

// Subscribed-only artisans for the current 30-min rotation window (see
// migration 0049_suggested_artisans_rotation.sql). This is just the SSR initial
// payload — the client component re-fetches on each half-hour boundary.
async function getSuggestedArtisans(currentUserId?: string): Promise<SuggestedArtisan[]> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_suggested_artisans', {
    p_exclude: currentUserId ?? null,
    p_limit: 5,
  });
  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    craft_category: string | null;
    city: string | null;
  }>).map((r) => ({
    id: r.id,
    username: r.username,
    full_name: r.full_name,
    craft_category: r.craft_category,
    city: r.city,
    avatar_url: r.avatar_url,
    is_subscribed: true, // الـ RPC يرجع المشتركين فقط
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
  const [suggestedArtisans, trendingData] = await Promise.all([
    getSuggestedArtisans(currentUserId),
    getTrendingData(),
  ]);

  return (
    <aside
      dir="rtl"
      className="hidden xl:flex h-full w-[284px] shrink-0 flex-col overflow-y-auto pb-6 sidebar-scroll"
    >
      <div className="space-y-5 p-3">

        {/* ── Suggested artisans + tip (client component for translations) ── */}
        <SuggestedArtisans artisans={suggestedArtisans} excludeUserId={currentUserId} />

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
