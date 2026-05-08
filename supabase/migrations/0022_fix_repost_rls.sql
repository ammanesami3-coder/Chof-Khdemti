-- ── 0022_fix_repost_rls.sql ──────────────────────────────────────────────────
-- Allow any authenticated user to create reposts (shared_post_id not null).
-- Original posts (shared_post_id is null) remain artisan-only.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "posts_insert_artisan"          on public.posts;
drop policy if exists "posts_insert_artisan_or_repost" on public.posts;

create policy "posts_insert_artisan_or_repost"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and (
      -- Reposts: any authenticated user can share a post to their profile
      (shared_post_id is not null)
      or
      -- Original posts: artisans only
      (shared_post_id is null and exists (
        select 1 from public.users u
        where u.id = auth.uid()
          and u.account_type = 'artisan'
      ))
    )
  );
