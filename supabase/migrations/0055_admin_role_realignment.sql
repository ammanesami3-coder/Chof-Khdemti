-- =============================================================
-- 0055_admin_role_realignment.sql
--
-- Direct data adjustment (safe to auto-apply): realigns two specific
-- accounts to their correct platform roles. Keyed by USERNAME, not by
-- auth UUID, so it works across every environment without editing.
--
--   • 'ChofKhdemti'     → role 'admin'   (the official platform account)
--   • 'salhi_madani55'  → base role      (downgraded out of moderation)
--                         and its moderator_permissions row is revoked.
--
-- Roles allowed by profiles_role_check (migration 0051):
--   'user' | 'artisan' | 'moderator' | 'admin'
-- The correct base role for a downgraded account mirrors the revoke flow
-- in src/lib/actions/admin-moderators.ts: 'artisan' when the account_type
-- is artisan, otherwise 'user'.
--
-- Every block is guarded: a missing user prints a NOTICE instead of
-- failing, and re-running is idempotent.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ChofKhdemti → admin (verified official account)
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from public.users where username = 'ChofKhdemti';

  if v_uid is null then
    raise notice 'User ChofKhdemti not found — skipping admin grant.';
  else
    update public.profiles
       set role        = 'admin',
           is_verified = true,
           updated_at  = now()
     where user_id = v_uid;
    raise notice 'ChofKhdemti (%) set to role admin.', v_uid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. salhi_madani55 → base role + revoke moderator permissions
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_uid       uuid;
  v_acct_type text;
  v_base_role text;
begin
  select u.id, u.account_type
    into v_uid, v_acct_type
    from public.users u
   where u.username = 'salhi_madani55';

  if v_uid is null then
    raise notice 'User salhi_madani55 not found — skipping downgrade.';
  else
    v_base_role := case when v_acct_type = 'artisan' then 'artisan' else 'user' end;

    -- Never downgrade an admin by accident; only strip moderation roles.
    update public.profiles
       set role       = v_base_role,
           updated_at = now()
     where user_id = v_uid
       and role <> 'admin';

    -- Revoke any granular moderator permissions.
    delete from public.moderator_permissions
     where user_id = v_uid;

    raise notice 'salhi_madani55 (%) downgraded to role % and permissions revoked.',
      v_uid, v_base_role;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Verify — list elevated accounts and any moderator flags.
-- ─────────────────────────────────────────────────────────────
select u.username,
       p.role,
       mp.can_delete_posts,
       mp.can_delete_comments,
       mp.can_ban_users,
       mp.can_view_reports
from public.profiles p
join public.users u on u.id = p.user_id
left join public.moderator_permissions mp on mp.user_id = p.user_id
where p.role in ('admin', 'moderator')
   or u.username in ('ChofKhdemti', 'salhi_madani55')
order by p.role, u.username;
