-- =============================================================
-- 0053_ban_enforcement.sql
-- Enforce bans at the database layer: a user whose profile has
-- banned_at set (see 0052) can no longer INSERT posts, comments, or
-- messages. Read access is unchanged; write access is the hard stop.
--
-- Recreates the current INSERT policies (their latest definitions:
-- posts_insert_authenticated 0032, comments_insert_auth 0002,
-- messages_insert_parties 0002) with an added not-banned predicate.
-- Idempotent.
-- =============================================================

-- ---------------------------------------------------------------
-- Helper: is the current user banned?
-- SECURITY DEFINER + stable so it can be used inside RLS policies
-- without recursion concerns.
-- ---------------------------------------------------------------
create or replace function public.is_banned()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and banned_at is not null
  );
$$;

-- ---------------------------------------------------------------
-- posts — block inserts from banned users
-- ---------------------------------------------------------------
drop policy if exists "posts_insert_authenticated" on public.posts;
create policy "posts_insert_authenticated"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and not public.is_banned()
  );

-- ---------------------------------------------------------------
-- comments — block inserts from banned users
-- ---------------------------------------------------------------
drop policy if exists "comments_insert_auth" on public.comments;
create policy "comments_insert_auth"
  on public.comments for insert
  with check (
    author_id = auth.uid()
    and not public.is_banned()
  );

-- ---------------------------------------------------------------
-- messages — block inserts from banned users (keep party check)
-- ---------------------------------------------------------------
drop policy if exists "messages_insert_parties" on public.messages;
create policy "messages_insert_parties"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and not public.is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    )
  );
