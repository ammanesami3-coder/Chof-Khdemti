-- ── 0032_posts_allow_all_users.sql ───────────────────────────────────────────
-- Allow all authenticated users (artisans AND customers) to create original posts.
-- Previously only artisans could create original posts; customers could only repost.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "posts_insert_artisan_or_repost" on public.posts;

create policy "posts_insert_authenticated"
  on public.posts for insert
  with check (author_id = auth.uid());
