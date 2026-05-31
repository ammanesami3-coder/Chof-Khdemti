-- =============================================================
-- 0052_moderation_actions.sql
-- Moderation quick-actions: ban tracking on profiles + secure
-- SECURITY DEFINER RPCs for deleting content and banning users.
--
-- The RPCs verify the CALLER's role/permissions internally (admin, or a
-- moderator holding the matching granular flag from moderator_permissions),
-- then act with definer rights — so the strict per-row RLS on posts/comments
-- (author-only delete) stays untouched while moderators can still act.
--
-- Builds on 0051 (role column, moderator_permissions, is_platform_admin()).
-- Idempotent.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Ban tracking on profiles
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references public.profiles(user_id) on delete set null;

comment on column public.profiles.banned_at is
  'When the user was banned by moderation. NULL = active. Set via moderator_ban_user().';

create index if not exists profiles_banned_idx
  on public.profiles(banned_at)
  where banned_at is not null;

-- ---------------------------------------------------------------
-- 2. Permission helper — does the caller hold a given moderator flag?
--    Admins implicitly pass every check.
-- ---------------------------------------------------------------
create or replace function public.has_mod_permission(p_flag text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
  v_ok   boolean;
begin
  select role into v_role from public.profiles where user_id = auth.uid();

  if v_role = 'admin' then
    return true;
  end if;

  if v_role <> 'moderator' then
    return false;
  end if;

  -- Read the requested flag from the caller's moderator_permissions row.
  execute format(
    'select coalesce(mp.%I, false) from public.moderator_permissions mp where mp.user_id = $1',
    p_flag
  )
  into v_ok
  using auth.uid();

  return coalesce(v_ok, false);
end;
$$;

-- ---------------------------------------------------------------
-- 3. moderator_delete_post — requires can_delete_posts (or admin)
-- ---------------------------------------------------------------
create or replace function public.moderator_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_mod_permission('can_delete_posts') then
    raise exception 'Unauthorized: missing can_delete_posts permission';
  end if;

  delete from public.posts where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------
-- 4. moderator_delete_comment — requires can_delete_comments (or admin)
-- ---------------------------------------------------------------
create or replace function public.moderator_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_mod_permission('can_delete_comments') then
    raise exception 'Unauthorized: missing can_delete_comments permission';
  end if;

  delete from public.comments where id = p_comment_id;
end;
$$;

-- ---------------------------------------------------------------
-- 5. moderator_ban_user — requires can_ban_users (or admin)
--    Never allows banning an admin, nor self-banning.
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
  if v_target_role = 'admin' then
    raise exception 'Cannot ban an admin account';
  end if;

  update public.profiles
  set banned_at = now(),
      banned_by = auth.uid(),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------
-- 6. Grants — these RPCs gate authorization internally, so expose them
--    to authenticated callers (the function body enforces permissions).
-- ---------------------------------------------------------------
grant execute on function public.moderator_delete_post(uuid)    to authenticated;
grant execute on function public.moderator_delete_comment(uuid) to authenticated;
grant execute on function public.moderator_ban_user(uuid)       to authenticated;
