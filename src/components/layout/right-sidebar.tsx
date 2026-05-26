import Link from 'next/link';
import { Star, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/shared/user-avatar';
import { TrendingWidget, type TrendingEntry } from './trending-widget';

// ── Types ──────────────────────────────────────────────────────────────────────

type ArtisanRow = {
  id: string;
  username: string;
  full_name: string;
  profiles: { avatar_url: string | null; craft_category: string | null; city: string | null } | null;
};

const TIPS = [
  'أضف صور أعمالك لزيادة طلبات الخدمة',
  'ردّ على رسائل الزبائن بسرعة لبناء سمعة ممتازة',
  'اكتب وصفاً واضحاً لتخصصك في ملفك الشخصي',
];

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

// ── ArtisanCard ────────────────────────────────────────────────────────────────

function ArtisanCard({ artisan }: { artisan: ArtisanRow }) {
  const profile = artisan.profiles;
  return (
    <div className="flex items-center gap-2.5 rounded-xl p-2 transition-colors duration-200 hover:bg-accent group">
      <Link href={`/profile/${artisan.username}`} className="shrink-0">
        <UserAvatar
          user={{ username: artisan.username, full_name: artisan.full_name, avatar_url: profile?.avatar_url }}
          size="sm"
          linkable={false}
          userId={artisan.id}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${artisan.username}`} className="block">
          <p className="truncate text-sm font-semibold group-hover:text-[#FF9F43] transition-colors">
            {artisan.full_name}
          </p>
          {profile?.craft_category && (
            <p className="truncate text-xs text-muted-foreground">{profile.craft_category}</p>
          )}
        </Link>
      </div>
      <Link href={`/profile/${artisan.username}`} className="btn-follow">
        متابعة
      </Link>
    </div>
  );
}

// ── RightSidebar ───────────────────────────────────────────────────────────────

type Props = { currentUserId?: string };

export async function RightSidebar({ currentUserId }: Props) {
  // الجلب المتوازي: حرفيون مقترحون + بيانات الترند الحقيقية
  const [artisans, trendingData] = await Promise.all([
    getTopArtisans(currentUserId),
    getTrendingData(),
  ]);

  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  return (
    <aside
      dir="rtl"
      className="hidden xl:flex h-full w-[284px] shrink-0 flex-col overflow-y-auto pb-6 sidebar-scroll"
    >
      <div className="space-y-5 p-3">

        {/* ── Suggested artisans ── */}
        {artisans.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#FF9F43]" />
                <h3 className="text-sm font-semibold">حرفيون مقترحون</h3>
              </div>
              <Link
                href="/explore"
                className="text-xs font-medium text-[#FF9F43] transition-colors hover:text-[#E88A38]"
              >
                عرض الكل
              </Link>
            </div>
            <div className="space-y-0.5">
              {artisans.map((a) => (
                <ArtisanCard key={a.id} artisan={a} />
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border" />

        {/* ── Trending categories (ديناميكي + auto-refresh) ── */}
        <TrendingWidget initialData={trendingData} />

        <div className="h-px bg-border" />

        {/* ── Tip of the day ── */}
        <div className="rounded-xl bg-[#FF9F43]/8 p-4 dark:bg-[#FF9F43]/10">
          <div className="mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 fill-[#FF9F43] text-[#FF9F43]" />
            <p className="text-xs font-semibold text-[#E88A38] dark:text-[#FFBA69]">نصيحة اليوم</p>
          </div>
          <p className="text-xs leading-relaxed text-foreground/70 dark:text-foreground/60">{tip}</p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40">
          Chof Khdemti © 2025
        </p>
      </div>
    </aside>
  );
}
