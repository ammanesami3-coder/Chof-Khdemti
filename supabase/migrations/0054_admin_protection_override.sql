-- =============================================================
-- 0054_admin_protection_override.sql
-- Strict admin-protection override for the moderation RPCs.
--
-- RULE (non-negotiable):
--   A moderator (role = 'moderator') must NEVER be able to delete an
--   admin's content or ban an admin — under any circumstance. The only
--   actor allowed to act on an admin-owned target is another admin.
--
--   So every RPC now resolves the TARGET's role and, if it is 'admin',
--   aborts unless the CALLER is also 'admin'. The pre-existing granular
--   permission checks (has_mod_permission(...)) are kept as the first gate.
--
-- Builds on 0051 (role, is_platform_admin) and 0052 (has_mod_permission,
-- moderator_delete_post/comment, moderator_ban_user). Idempotent — these
-- are CREATE OR REPLACE definitions that supersede 0052's versions.
-- =============================================================

-- ---------------------------------------------------------------
-- Helper: the caller's own moderation role ('user' when unknown).
--   SECURITY DEFINER so it bypasses profiles RLS the same way the
--   other moderation helpers do, with a pinned search_path.
-- ---------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where user_id = auth.uid()),
    'user'
  );
$$;

-- ---------------------------------------------------------------
-- 1. moderator_delete_post
--    Gate: can_delete_posts (admins implicitly pass).
--    Override: if the post author is an admin, only an admin may delete.
-- ---------------------------------------------------------------
create or replace function public.moderator_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id   uuid;
  v_author_role text;
begin
  if not public.has_mod_permission('can_delete_posts') then
    raise exception 'Unauthorized: missing can_delete_posts permission';
  end if;

  select author_id into v_author_id from public.posts where id = p_post_id;
  if v_author_id is null then
    return; -- already gone; nothing to do
  end if;

  select role into v_author_role from public.profiles where user_id = v_author_id;

  -- Strict protection: admin-owned content is untouchable by non-admins.
  if v_author_role = 'admin' and public.current_user_role() <> 'admin' then
    raise exception 'Unauthorized: cannot moderate content owned by an admin';
  end if;

  delete from public.posts where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------
-- 2. moderator_delete_comment
--    Gate: can_delete_comments (admins implicitly pass).
--    Override: if the comment author is an admin, only an admin may delete.
-- ---------------------------------------------------------------
create or replace function public.moderator_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id   uuid;
  v_author_role text;
begin
  if not public.has_mod_permission('can_delete_comments') then
    raise exception 'Unauthorized: missing can_delete_comments permission';
  end if;

  select author_id into v_author_id from public.comments where id = p_comment_id;
  if v_author_id is null then
    return; -- already gone
  end if;

  select role into v_author_role from public.profiles where user_id = v_author_id;

  if v_author_role = 'admin' and public.current_user_role() <> 'admin' then
    raise exception 'Unauthorized: cannot moderate content owned by an admin';
  end if;

  delete from public.comments where id = p_comment_id;
end;
$$;

-- ---------------------------------------------------------------
-- 3. moderator_ban_user
--    Gate: can_ban_users (admins implicitly pass) + no self-ban.
--    Override: an admin target may only be banned by another admin
--    (previously admins could never be banned at all).
-- ---------------------------------------------------------------
create or replace function public.moderator_ban_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  if not public.has_mod_permission('can_ban_users') then
    raise exception 'Unauthorized: missing can_ban_users permission';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot ban yourself';
  end if;

  select role into v_target_role from public.profiles where user_id = p_user_id;

  -- Strict protection: only an admin may ban another admin.
  if v_target_role = 'admin' and public.current_user_role() <> 'admin' then
    raise exception 'Unauthorized: cannot ban an admin account';
  end if;

  update public.profiles
  set banned_at  = now(),
      banned_by  = auth.uid(),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------
-- 4. Grants (re-assert; CREATE OR REPLACE preserves them, but explicit
--    is safer across environments).
-- ---------------------------------------------------------------
grant execute on function public.current_user_role()              to authenticated;
grant execute on function public.moderator_delete_post(uuid)      to authenticated;
grant execute on function public.moderator_delete_comment(uuid)   to authenticated;
grant execute on function public.moderator_ban_user(uuid)         to authenticated;
