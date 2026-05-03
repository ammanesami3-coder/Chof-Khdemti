-- ═══════════════════════════════════════════════════════════════
-- 0016_status_extended.sql — توسيع نظام الحالات (صور، فيديو، إعجابات، ردود)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. نوع المحتوى ───────────────────────────────────────────────
create type public.status_content_type as enum ('text', 'image', 'video');

-- ── 2. إزالة الـ constraint القديم + جعل content nullable ────────
alter table public.status_updates
  drop constraint if exists status_updates_content_check;

alter table public.status_updates
  alter column content drop not null;

-- ── 3. إضافة الأعمدة الجديدة ────────────────────────────────────
alter table public.status_updates
  add column if not exists content_type public.status_content_type not null default 'text',
  add column if not exists media_url     text,
  add column if not exists thumbnail_url text,
  add column if not exists text_color    text not null default '#FFFFFF',
  add column if not exists font_style    text not null default 'default',
  add column if not exists duration      int  not null default 5,
  add column if not exists likes_count   int  not null default 0;

-- ── 4. constraint جديد يضمن اتساق البيانات ──────────────────────
alter table public.status_updates
  add constraint status_content_type_check check (
    (content_type = 'text'  and content   is not null and media_url is null) or
    (content_type in ('image','video')     and media_url is not null)
  );

-- ── 5. جدول الإعجابات على الحالات ───────────────────────────────
create table if not exists public.status_likes (
  id         uuid        primary key default gen_random_uuid(),
  status_id  uuid        not null references public.status_updates(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  reaction   text        not null default 'like',
  created_at timestamptz not null default now(),
  unique (status_id, user_id)
);

create index if not exists status_likes_status_idx on public.status_likes(status_id);

alter table public.status_likes enable row level security;

create policy "Status likes visible to all"
  on public.status_likes for select using (true);
create policy "Users like statuses"
  on public.status_likes for insert with check (auth.uid() = user_id);
create policy "Users update own reactions"
  on public.status_likes for update using (auth.uid() = user_id);
create policy "Users unlike own"
  on public.status_likes for delete using (auth.uid() = user_id);

-- ── 6. reply_to_status_id في messages ────────────────────────────
alter table public.messages
  add column if not exists reply_to_status_id uuid
  references public.status_updates(id) on delete set null;

create index if not exists messages_reply_status_idx
  on public.messages(reply_to_status_id)
  where reply_to_status_id is not null;

-- ── 7. تحديث policy لـ status_views (المالك يرى كل مشاهداته) ────
drop policy if exists "Viewer reads own views"  on public.status_views;
drop policy if exists "Users see relevant views" on public.status_views;

create policy "Users see relevant views"
  on public.status_views for select
  using (
    auth.uid() = viewer_id or
    auth.uid() = (
      select user_id from public.status_updates where id = status_id limit 1
    )
  );

-- ── 8. Triggers للإعجابات ────────────────────────────────────────
create or replace function public.inc_status_likes()
returns trigger language plpgsql security definer as $$
begin
  update public.status_updates set likes_count = likes_count + 1 where id = new.status_id;
  return new;
end; $$;

create or replace function public.dec_status_likes()
returns trigger language plpgsql security definer as $$
begin
  update public.status_updates
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.status_id;
  return old;
end; $$;

drop trigger if exists trg_inc_status_likes on public.status_likes;
create trigger trg_inc_status_likes
  after insert on public.status_likes
  for each row execute function public.inc_status_likes();

drop trigger if exists trg_dec_status_likes on public.status_likes;
create trigger trg_dec_status_likes
  after delete on public.status_likes
  for each row execute function public.dec_status_likes();
