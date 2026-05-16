-- ── 0033_saved_posts_reports.sql ─────────────────────────────────────────────
-- Saved posts (bookmarks) and post reports.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Saved posts ───────────────────────────────────────────────────────────────

create table if not exists public.saved_posts (
  user_id    uuid not null references public.users(id) on delete cascade,
  post_id    uuid not null references public.posts(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

-- Users can only see/manage their own saved posts
create policy "saved_posts_own"
  on public.saved_posts
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists saved_posts_user_idx
  on public.saved_posts(user_id, created_at desc);

-- ── Reports ───────────────────────────────────────────────────────────────────

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  post_id     uuid not null references public.posts(id)  on delete cascade,
  reason      text not null check (reason in (
    'spam', 'fraud', 'inappropriate', 'harassment', 'impersonation', 'other'
  )),
  details     text,
  created_at  timestamptz not null default now(),
  unique (reporter_id, post_id)
);

alter table public.reports enable row level security;

-- Reporters can insert + read their own reports; admins use service role
create policy "reports_insert_own"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "reports_select_own"
  on public.reports for select
  using (reporter_id = auth.uid());

create index if not exists reports_post_idx on public.reports(post_id);
create index if not exists reports_reporter_idx on public.reports(reporter_id);
