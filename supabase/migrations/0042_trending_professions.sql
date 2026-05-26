-- =============================================================
-- 0042_trending_professions.sql
-- نظام Trending Professions الديناميكي
-- يحسب المهن الأكثر طلباً بناءً على نشاط حقيقي من المنصة
-- =============================================================

-- ── 1. جدول النتائج المُسبق-الحساب ─────────────────────────────────────────

create table if not exists public.profession_trending_scores (
  craft_category    text        primary key,
  score             numeric(12,4) not null default 0,
  previous_score    numeric(12,4) not null default 0,
  artisan_count     int         not null default 0,
  post_count_7d     int         not null default 0,
  engagement_7d     int         not null default 0,   -- likes + comments + shares (7 days)
  message_count_7d  int         not null default 0,   -- رسائل وصلت لحرفيي هذه المهنة
  follower_count_7d int         not null default 0,   -- متابعات جديدة (7 days)
  trend_direction   text        not null default 'stable'
                    check (trend_direction in ('up', 'down', 'stable')),
  growth_pct        numeric(8,2) not null default 0,  -- % التغيير عن الفترة السابقة
  rank              int         not null default 0,
  computed_at       timestamptz not null default now()
);

alter table public.profession_trending_scores enable row level security;

create policy "trending_scores_public_read"
  on public.profession_trending_scores
  for select using (true);

-- Index للأداء
create index if not exists trending_scores_rank_idx
  on public.profession_trending_scores(rank asc)
  where artisan_count > 0;

-- ── 2. دالة الحساب الرئيسية ──────────────────────────────────────────────────
-- تُشغَّل من cron كل 30 دقيقة
-- الخوارزمية: Weighted Score يجمع نشاط 7 أيام الأخيرة

create or replace function public.compute_profession_trending_scores()
returns void
language plpgsql
security definer
as $$
declare
  v_interval interval := interval '7 days';
begin
  insert into public.profession_trending_scores as pts (
    craft_category,
    score,
    previous_score,
    artisan_count,
    post_count_7d,
    engagement_7d,
    message_count_7d,
    follower_count_7d,
    trend_direction,
    growth_pct,
    rank,
    computed_at
  )
  with

  -- جمع الإحصائيات لكل مهنة
  craft_stats as (
    select
      pr.craft_category,

      -- عدد الحرفيين النشطين (كل الأوقات)
      count(distinct u.id)                                                        as artisan_count,

      -- المنشورات الجديدة في آخر 7 أيام
      count(distinct case
        when po.created_at >= now() - v_interval then po.id
      end)                                                                        as posts_7d,

      -- التفاعل: likes + comments من عدادات المنشورات (سريع، لا join إضافي)
      coalesce(sum(
        case when po.created_at >= now() - v_interval
          then po.likes_count + po.comments_count
          else 0
        end
      ), 0)                                                                       as engagement_7d,

      -- الرسائل التي وصلت لهذه المهنة (إشارة الطلب الحقيقي)
      count(distinct case
        when m.created_at >= now() - v_interval then m.id
      end)                                                                        as messages_7d,

      -- المتابعات الجديدة لحرفيي هذه المهنة (إشارة النمو)
      count(distinct case
        when f.created_at >= now() - v_interval then f.follower_id || f.following_id::text
      end)                                                                        as follows_7d

    from public.profiles pr
    join public.users u
      on u.id = pr.user_id
      and u.account_type = 'artisan'
    left join public.posts po
      on po.author_id = u.id
    left join public.conversations cv
      on cv.artisan_id = u.id
    left join public.messages m
      on m.conversation_id = cv.id
    left join public.follows f
      on f.following_id = u.id
    where pr.craft_category is not null
    group by pr.craft_category
  ),

  -- حساب الـ Score الموزون لكل مهنة
  -- الأوزان مرتبة حسب قوة الإشارة:
  --   messages  0.25 — أقوى إشارة طلب (زبون أرسل رسالة = نية حقيقية)
  --   follows   0.20 — نمو الجمهور
  --   artisans  0.20 — قاعدة العرض
  --   posts     0.15 — النشاط الأخير
  --   engagement 0.20 — جودة المحتوى
  scored as (
    select
      cs.*,
      (
        cs.messages_7d  * 0.25 +
        cs.follows_7d   * 0.20 +
        cs.artisan_count * 0.20 +
        cs.posts_7d     * 0.15 +
        cs.engagement_7d * 0.20
      ) as new_score
    from craft_stats cs
  )

  select
    s.craft_category,

    -- Score الجديد
    s.new_score,

    -- Score السابق (لحساب الاتجاه)
    coalesce(pts_old.score, 0) as previous_score,

    -- الإحصائيات
    s.artisan_count::int,
    s.posts_7d::int,
    s.engagement_7d::int,
    s.messages_7d::int,
    s.follows_7d::int,

    -- اتجاه الترند (مقارنة مع آخر قياس)
    case
      when coalesce(pts_old.score, 0) <= 0 then 'stable'
      when s.new_score > pts_old.score * 1.05 then 'up'
      when s.new_score < pts_old.score * 0.95 then 'down'
      else 'stable'
    end as trend_direction,

    -- نسبة النمو
    case
      when coalesce(pts_old.score, 0) <= 0 then 0::numeric
      else round(
        ((s.new_score - pts_old.score) / nullif(pts_old.score, 0) * 100)::numeric,
        1
      )
    end as growth_pct,

    -- الترتيب
    row_number() over (order by s.new_score desc)::int as rank,

    now() as computed_at

  from scored s
  left join public.profession_trending_scores pts_old
    using (craft_category)

  on conflict (craft_category) do update set
    score             = excluded.score,
    previous_score    = excluded.previous_score,
    artisan_count     = excluded.artisan_count,
    post_count_7d     = excluded.post_count_7d,
    engagement_7d     = excluded.engagement_7d,
    message_count_7d  = excluded.message_count_7d,
    follower_count_7d = excluded.follower_count_7d,
    trend_direction   = excluded.trend_direction,
    growth_pct        = excluded.growth_pct,
    rank              = excluded.rank,
    computed_at       = excluded.computed_at;
end;
$$;

-- ── 3. RPC للـ Frontend ──────────────────────────────────────────────────────

create or replace function public.get_trending_professions(p_limit int default 8)
returns table (
  craft_category    text,
  score             numeric,
  artisan_count     int,
  engagement_7d     int,
  message_count_7d  int,
  trend_direction   text,
  growth_pct        numeric,
  rank              int,
  computed_at       timestamptz
)
language sql
security definer
stable
as $$
  select
    craft_category,
    score,
    artisan_count,
    engagement_7d,
    message_count_7d,
    trend_direction,
    growth_pct,
    rank,
    computed_at
  from public.profession_trending_scores
  where artisan_count > 0
  order by rank asc
  limit p_limit;
$$;

-- ── 4. جدول مراقبة التحديثات (للـ realtime subscription) ────────────────────

create table if not exists public.trending_refresh_log (
  id          bigint      generated always as identity primary key,
  refreshed_at timestamptz not null default now()
);

alter table public.trending_refresh_log enable row level security;
create policy "trending_log_public_read"
  on public.trending_refresh_log for select using (true);

-- تسجيل كل عملية تحديث
create or replace function public.compute_and_log_trending()
returns void language plpgsql security definer as $$
begin
  perform public.compute_profession_trending_scores();
  insert into public.trending_refresh_log (refreshed_at) values (now());
  -- حذف السجلات القديمة (الاحتفاظ بآخر 100 فقط)
  delete from public.trending_refresh_log
  where id not in (
    select id from public.trending_refresh_log order by id desc limit 100
  );
end;
$$;

-- ── 5. تشغيل الحساب الأولي عند تطبيق الـ Migration ─────────────────────────
select public.compute_and_log_trending();

-- ── 6. جدولة Cron (فعّل امتداد pg_cron أولاً في Supabase Dashboard) ─────────
-- select cron.schedule('refresh-trending', '*/30 * * * *', 'select public.compute_and_log_trending()');
