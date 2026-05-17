import Link from 'next/link';
import { TrendingUp, Star, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/shared/user-avatar';

// ── Types ──────────────────────────────────────────────────────────────────────

type ArtisanRow = {
  id: string;
  username: string;
  full_name: string;
  profiles: { avatar_url: string | null; craft_category: string | null; city: string | null } | null;
};

// ── Static data ────────────────────────────────────────────────────────────────

const TRENDING = [
  { emoji: '🪵', label: 'نجارة',        count: 124 },
  { emoji: '⚡', label: 'كهرباء',       count:  98 },
  { emoji: '🎨', label: 'صباغة',        count:  87 },
  { emoji: '🔧', label: 'سباكة',        count:  72 },
  { emoji: '🚗', label: 'ميكانيك',      count:  65 },
];

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
      {/* CSS-only gradient hover — works in Server Component */}
      <Link href={`/profile/${artisan.username}`} className="btn-follow">
        متابعة
      </Link>
    </div>
  );
}

// ── RightSidebar ───────────────────────────────────────────────────────────────

type Props = { currentUserId?: string };

export async function RightSidebar({ currentUserId }: Props) {
  const artisans = await getTopArtisans(currentUserId);
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

  return (
    <aside
      dir="rtl"
      className="hidden xl:flex w-[284px] shrink-0 flex-col overflow-y-auto pb-6 sidebar-scroll"
      style={{ position: 'sticky', top: '3.5rem', height: 'calc(100vh - 3.5rem)', alignSelf: 'flex-start' }}
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

        {/* ── Trending categories ── */}
        <div>
          <div className="mb-3 flex items-center gap-2 px-2">
            <TrendingUp className="h-4 w-4 text-[#FF9F43]" />
            <h3 className="text-sm font-semibold">الأكثر طلبًا</h3>
          </div>
          <div className="space-y-0.5">
            {TRENDING.map(({ emoji, label, count }) => (
              <Link
                key={label}
                href={`/explore?craft=${encodeURIComponent(label)}`}
                className="flex items-center gap-3 rounded-xl p-2 transition-all duration-200 hover:bg-accent group"
              >
                <span className="text-xl leading-none">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{count} حرفي</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

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
