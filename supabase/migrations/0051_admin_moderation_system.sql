-- =============================================================
-- 0051_admin_moderation_system.sql
-- Admin / moderator framework + granular permissions + content reports.
--
-- Part 1 — secure, granular backend foundation only (no frontend).
--
-- NOTE ON THE REPORTS TABLE:
--   A `public.reports` table already exists (migration 0033) with a
--   different, working shape (post_id NOT NULL, reason CHECK, details,
--   unique(reporter_id, post_id)) and is consumed by report-post.ts.
--   Per the chosen approach we LEAVE 0033's `reports` table untouched
--   and introduce a NEW table `public.content_reports` matching the
--   moderation spec (target_post_id / target_comment_id / status).
--
-- Idempotent: safe to run multiple times (CREATE ... IF NOT EXISTS,
-- guarded ALTER / policy / constraint blocks).
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Granular roles — `role` column on public.profiles
--
--    The platform already distinguishes account_type ('artisan' /
--    'customer') on public.users. `role` is an ADDITIVE moderation
--    role and does not replace account_type.
--
--    Values: 'user' | 'artisan' | 'moderator' | 'admin'
--    (text + CHECK rather than a pg enum, for easier future edits.)
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'artisan', 'moderator', 'admin'));
  end if;
end;
$$;

comment on column public.profiles.role is
  'Moderation role: user | artisan | moderator | admin. Additive to users.account_type; controls access to the moderation system.';

-- One-time backfill: align role with the existing account_type so that
-- artisans surface as ''artisan'' and everyone else as ''user''. Only
-- touches rows still on the default ''user'' so admins/moderators set
-- later are never clobbered on re-run.
update public.profiles p
set    role = 'artisan'
from   public.users u
where  u.id = p.user_id
  and  u.account_type = 'artisan'
  and  p.role = 'user';

-- ---------------------------------------------------------------
-- 2. moderator_permissions — what each moderator is allowed to do
--    Managed exclusively by admins (see RLS below).
-- ---------------------------------------------------------------
create table if not exists public.moderator_permissions (
  user_id            uuid        primary key references public.profiles(user_id) on delete cascade,
  can_delete_posts   boolean     not null default false,
  can_delete_comments boolean    not null default false,
  can_ban_users      boolean     not null default false,
  can_view_reports   boolean     not null default true,
  assigned_by        uuid        references public.profiles(user_id) on delete set null,
  created_at         timestamptz not null default now()
);

alter table public.moderator_permissions enable row level security;

create index if not exists moderator_permissions_assigned_by_idx
  on public.moderator_permissions(assigned_by);

-- ---------------------------------------------------------------
-- 3. content_reports — reports on posts and comments
--    A report targets a post OR a comment (at least one is required).
-- ---------------------------------------------------------------
create table if not exists public.content_reports (
  id                uuid        primary key default gen_random_uuid(),
  reporter_id       uuid        not null references public.profiles(user_id) on delete cascade,
  target_post_id    uuid        references public.posts(id)    on delete cascade,
  target_comment_id uuid        references public.comments(id) on delete cascade,
  reason            text,
  status            text        not null default 'pending'
                                check (status in ('pending', 'resolved', 'dismissed')),
  created_at        timestamptz not null default now(),
  constraint content_reports_has_target
    check (target_post_id is not null or target_comment_id is not null)
);

alter table public.content_reports enable row level security;

create index if not exists content_reports_status_idx       on public.content_reports(status, created_at desc);
create index if not exists content_reports_reporter_idx     on public.content_reports(reporter_id);
create index if not exists content_reports_target_post_idx  on public.content_reports(target_post_id);
create index if not exists content_reports_target_comm_idx  on public.content_reports(target_comment_id);

-- ---------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER) — used inside RLS policies
--    to evaluate the caller's role/permissions without tripping
--    RLS recursion. search_path pinned per security-hardening style.
-- ---------------------------------------------------------------

-- Is the current user a platform admin?
create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- Can the current user view/triage reports?
-- True for admins, OR moderators that have can_view_reports = true.
create or replace function public.can_view_reports()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  )
  or exists (
    select 1
    from public.profiles p
    join public.moderator_permissions mp on mp.user_id = p.user_id
    where p.user_id = auth.uid()
      and p.role = 'moderator'
      and mp.can_view_reports = true
  );
$$;

-- ---------------------------------------------------------------
-- 5. RLS — content_reports
--    - INSERT: any authenticated user, only as themselves.
--    - SELECT / UPDATE: admins, or moderators with can_view_reports.
--    - DELETE: admins only.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_reports'
      and policyname = 'content_reports_insert_authenticated'
  ) then
    create policy "content_reports_insert_authenticated"
      on public.content_reports for insert
      to authenticated
      with check (reporter_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_reports'
      and policyname = 'content_reports_select_moderators'
  ) then
    create policy "content_reports_select_moderators"
      on public.content_reports for select
      to authenticated
      using (public.can_view_reports());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_reports'
      and policyname = 'content_reports_update_moderators'
  ) then
    create policy "content_reports_update_moderators"
      on public.content_reports for update
      to authenticated
      using (public.can_view_reports())
      with check (public.can_view_reports());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_reports'
      and policyname = 'content_reports_delete_admin'
  ) then
    create policy "content_reports_delete_admin"
      on public.content_reports for delete
      to authenticated
      using (public.is_platform_admin());
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- 6. RLS — moderator_permissions
--    - SELECT: admins (manage), or the moderator reading their OWN row
--      (the app needs to know its own granted powers).
--    - INSERT / UPDATE / DELETE: admins only.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderator_permissions'
      and policyname = 'moderator_permissions_select'
  ) then
    create policy "moderator_permissions_select"
      on public.moderator_permissions for select
      to authenticated
      using (public.is_platform_admin() or user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderator_permissions'
      and policyname = 'moderator_permissions_insert_admin'
  ) then
    create policy "moderator_permissions_insert_admin"
      on public.moderator_permissions for insert
      to authenticated
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderator_permissions'
      and policyname = 'moderator_permissions_update_admin'
  ) then
    create policy "moderator_permissions_update_admin"
      on public.moderator_permissions for update
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderator_permissions'
      and policyname = 'moderator_permissions_delete_admin'
  ) then
    create policy "moderator_permissions_delete_admin"
      on public.moderator_permissions for delete
      to authenticated
      using (public.is_platform_admin());
  end if;
end;
$$;
