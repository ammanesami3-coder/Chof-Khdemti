'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrendingEntry = {
  craft_category: string;
  score: number;
  artisan_count: number;
  engagement_7d: number;
  message_count_7d: number;
  trend_direction: 'up' | 'down' | 'stable';
  growth_pct: number;
  rank: number;
  computed_at: string;
};

// ── Craft emoji map (by Arabic name) ─────────────────────────────────────────

const CRAFT_EMOJI: Record<string, string> = {
  'نجارة': '🪵',
  'سباكة': '🔧',
  'كهرباء': '⚡',
  'دهان': '🎨',
  'بلاطة': '🏠',
  'ميكانيكي سيارات': '🚗',
  'خياط': '🧵',
  'حلاق رجالي': '✂️',
  'حلاقة نساء': '💇',
  'طباخ': '🍳',
  'مصور': '📷',
  'مصمم غرافيك': '🖥️',
  'مُكيفات': '❄️',
  'بناء': '🏗️',
  'مصلح هواتف': '📱',
  'بستاني': '🌱',
  'ديكور داخلي': '🛋️',
  'سائق': '🚙',
  'مُدرّس خصوصي': '📚',
  'معلّم ياردات': '🌿',
  'حلواني': '🍰',
  'خبّاز': '🥖',
  'عناية بالبشرة': '💆',
  'مربية أطفال': '👶',
};

function getCraftEmoji(name: string): string {
  return CRAFT_EMOJI[name] ?? '🔨';
}

// ── Static fallback (used while DB is empty or loading) ───────────────────────

const STATIC_FALLBACK: TrendingEntry[] = [
  { craft_category: 'نجارة',  score: 0, artisan_count: 0, engagement_7d: 0, message_count_7d: 0, trend_direction: 'stable', growth_pct: 0, rank: 1, computed_at: '' },
  { craft_category: 'كهرباء', score: 0, artisan_count: 0, engagement_7d: 0, message_count_7d: 0, trend_direction: 'stable', growth_pct: 0, rank: 2, computed_at: '' },
  { craft_category: 'سباكة',  score: 0, artisan_count: 0, engagement_7d: 0, message_count_7d: 0, trend_direction: 'stable', growth_pct: 0, rank: 3, computed_at: '' },
  { craft_category: 'دهان',   score: 0, artisan_count: 0, engagement_7d: 0, message_count_7d: 0, trend_direction: 'stable', growth_pct: 0, rank: 4, computed_at: '' },
  { craft_category: 'ميكانيكي سيارات', score: 0, artisan_count: 0, engagement_7d: 0, message_count_7d: 0, trend_direction: 'stable', growth_pct: 0, rank: 5, computed_at: '' },
];

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchTrending(): Promise<TrendingEntry[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_trending_professions', { p_limit: 8 });
  if (error || !data || !(data as unknown[]).length) return STATIC_FALLBACK;
  return data as unknown as TrendingEntry[];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TrendingSkeleton() {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-2">
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-8 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ── Single trending item ──────────────────────────────────────────────────────

function TrendingItem({ item }: { item: TrendingEntry }) {
  const { t } = useLang();
  const emoji = getCraftEmoji(item.craft_category);
  const isUp = item.trend_direction === 'up';
  const isDown = item.trend_direction === 'down';
  const isNew = item.artisan_count === 0;

  return (
    <Link
      href={`/explore?craft=${encodeURIComponent(item.craft_category)}`}
      className="group flex items-center gap-2.5 rounded-xl p-2 transition-all duration-200 hover:bg-accent"
    >
      {/* Rank + Emoji */}
      <div className="relative shrink-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-base transition-transform duration-200 group-hover:scale-110">
          {emoji}
        </span>
        {/* نقطة "صاعد" للأول */}
        {item.rank === 1 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[7px] text-white">
            🔥
          </span>
        )}
      </div>

      {/* Name + count */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-snug transition-colors duration-150 group-hover:text-[#FF9F43]">
          {item.craft_category}
        </p>
        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
          {isNew ? (
            <span className="opacity-40">—</span>
          ) : (
            <>
              <span>{item.artisan_count.toLocaleString('ar')}</span>
              {' '}{t('artisanCountSuffix')}
              {item.engagement_7d > 0 && (
                <span className="opacity-60">
                  {' · '}{item.engagement_7d.toLocaleString('ar')} {t('engagementSuffix')}
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Trend indicator */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        {isUp && (
          <>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
            {item.growth_pct > 0 && (
              <span className="text-[10px] font-semibold leading-none text-emerald-500">
                +{item.growth_pct.toFixed(0)}%
              </span>
            )}
          </>
        )}
        {isDown && (
          <>
            <TrendingDown className="h-3.5 w-3.5 text-red-500" strokeWidth={2.5} />
            {item.growth_pct < 0 && (
              <span className="text-[10px] font-semibold leading-none text-red-500">
                {item.growth_pct.toFixed(0)}%
              </span>
            )}
          </>
        )}
        {!isUp && !isDown && (
          <Minus className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={2} />
        )}
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  initialData: TrendingEntry[];
};

export function TrendingWidget({ initialData }: Props) {
  const { t } = useLang();
  const { data: trending = initialData, isLoading } = useQuery({
    queryKey: ['trending-professions'],
    queryFn: fetchTrending,
    initialData: initialData.length > 0 ? initialData : undefined,
    staleTime: 4 * 60 * 1000,        // 4 دقائق — لا يُعاد الجلب قبلها
    refetchInterval: 5 * 60 * 1000,  // تحديث تلقائي كل 5 دقائق
    refetchIntervalInBackground: false,
  });

  const showSkeleton = isLoading && (!initialData || initialData.length === 0);

  // Freshness indicator — وقت آخر تحديث
  const lastUpdate = trending[0]?.computed_at
    ? new Date(trending[0].computed_at)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#FF9F43]" />
          <h3 className="text-sm font-semibold">{t('mostRequested')}</h3>
        </div>
        {lastUpdate && (
          <span
            className="text-[10px] text-muted-foreground/50"
            title={lastUpdate.toLocaleString('ar')}
          >
            {t('liveLabel')}
            <span
              className="ms-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle"
              aria-hidden="true"
            />
          </span>
        )}
      </div>

      {/* List */}
      {showSkeleton ? (
        <TrendingSkeleton />
      ) : (
        <div className="space-y-0.5">
          {trending.map((item) => (
            <TrendingItem key={item.craft_category} item={item} />
          ))}
        </div>
      )}

      {/* Link to explore with filter */}
      <Link
        href="/explore"
        className="mt-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {t('exploreAllCrafts')}
      </Link>
    </div>
  );
}
