-- ═══════════════════════════════════════════════════════════════
-- 0015_status_updates.sql — Status Updates (حالات 24 ساعة)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. الجدول الرئيسي ────────────────────────────────────────────
create table if not exists public.status_updates (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  content          text        not null check (char_length(content) <= 500),
  background_color text        not null default '#1877F2',
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '24 hours'),
  views_count      int         not null default 0
);

create index if not exists status_user_idx
  on public.status_updates(user_id);

create index if not exists status_active_idx
  on public.status_updates(expires_at);

-- ── 2. جدول المشاهدات ────────────────────────────────────────────
create table if not exists public.status_views (
  status_id uuid        not null references public.status_updates(id) on delete cascade,
  viewer_id uuid        not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);

-- ── 3. Trigger: زيادة views_count عند كل مشاهدة جديدة ─────────────
create or replace function public.inc_status_views()
returns trigger language plpgsql security definer as $$
begin
  update public.status_updates
  set views_count = views_count + 1
  where id = new.status_id;
  return new;
end;
$$;

drop trigger if exists trg_status_views on public.status_views;
create trigger trg_status_views
  after insert on public.status_views
  for each row execute function public.inc_status_views();

-- ── 4. RLS ───────────────────────────────────────────────────────
alter table public.status_updates enable row level security;
alter table public.status_views   enable row level security;

-- status_updates: الجميع يرى الحالات النشطة
create policy "Status visible to all if active"
  on public.status_updates for select
  using (expires_at > now());

create policy "Users insert own status"
  on public.status_updates for insert
  with check (auth.uid() = user_id);

create policy "Users delete own status"
  on public.status_updates for delete
  using (auth.uid() = user_id);

-- status_views: المستخدم يرى مشاهداته + يضيف مشاهدات
create policy "Viewer reads own views"
  on public.status_views for select
  using (auth.uid() = viewer_id);

create policy "Authenticated can insert views"
  on public.status_views for insert
  with check (auth.uid() = viewer_id);

-- ── 5. Function: حذف الحالات المنتهية يومياً ─────────────────────
create or replace function public.delete_expired_statuses()
returns void language plpgsql security definer as $$
begin
  delete from public.status_updates where expires_at <= now();
end;
$$;

-- تشغيل يومياً عند 01:00 صباحاً (يتطلب امتداد pg_cron مفعّلاً)
-- select cron.schedule('delete-expired-status', '0 1 * * *',
--   'select public.delete_expired_statuses()');
