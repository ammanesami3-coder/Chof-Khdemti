-- =============================================================
-- seed_admin_setup.sql  (MANUAL — run in the Supabase SQL editor)
--
-- Provisions the official platform account + your admin + a test
-- moderator. NOT a migration: it references real auth user UUIDs that
-- only exist in your project, so it is never auto-applied.
--
-- PREREQUISITES:
--   • Migrations 0051, 0052, 0053 already applied.
--   • The auth users below already exist (create via Auth > Users, or
--     have them sign up once) — public.users/profiles rows are created
--     by the signup trigger, then this script elevates their role.
--
-- HOW TO USE: replace the three placeholder UUIDs below, then run.
-- Each block is guarded: if the user/profile doesn't exist yet it
-- prints a NOTICE instead of failing, so you can fix and re-run safely.
-- Re-running is idempotent.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Official platform account → username 'ChofKhdemti', role 'admin'
--    (matches OFFICIAL_USERNAME used by isOfficialAccount / feed +
--     story injection). Set v_official_uuid to that account's auth id.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_official_uuid uuid := '34ff275f-cc3a-4eac-9eb7-2f70af0efd21'; -- ⬅️ REPLACE
begin
  if not exists (select 1 from auth.users where id = v_official_uuid) then
    raise notice 'Official auth user % not found. Create it (Auth > Users) then re-run.', v_official_uuid;
  else
    insert into public.users (id, username, full_name, account_type)
    values (v_official_uuid, 'ChofKhdemti', 'Chof Khdemti', 'artisan')
    on conflict (id) do update
      set username  = excluded.username,
          full_name = excluded.full_name;

    insert into public.profiles (user_id, role, bio, is_verified)
    values (v_official_uuid, 'admin', 'الحساب الرسمي لمنصة Chof Khdemti', true)
    on conflict (user_id) do update
      set role        = 'admin',
          is_verified = true;

    raise notice 'Official account ready: % (ChofKhdemti, admin).', v_official_uuid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2. Your own account → role 'admin'
--    Set v_admin_uuid to YOUR auth user id (sign in once first so the
--    profile row exists).
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_admin_uuid uuid := '283e944d-3504-4c3d-a5a2-ecbc15edbee5'; -- ⬅️ REPLACE (your UUID)
begin
  if not exists (select 1 from public.profiles where user_id = v_admin_uuid) then
    raise notice 'Profile for % not found. Sign in once, then re-run.', v_admin_uuid;
  else
    update public.profiles set role = 'admin' where user_id = v_admin_uuid;
    raise notice 'Admin granted to %.', v_admin_uuid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Test moderator → role 'moderator' + granular permissions
--    Set v_mod_uuid to the test user's auth id, and v_assigned_by to
--    the admin who appoints them (e.g. your UUID from section 2).
--    Adjust the boolean flags to taste.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_mod_uuid     uuid := '34ff275f-cc3a-4eac-9eb7-2f70af0efd21'; -- ⬅️ REPLACE (test user UUID)
  v_assigned_by  uuid := '283e944d-3504-4c3d-a5a2-ecbc15edbee5'; -- ⬅️ REPLACE (admin UUID)
begin
  if not exists (select 1 from public.profiles where user_id = v_mod_uuid) then
    raise notice 'Profile for % not found. Have the test user sign in once, then re-run.', v_mod_uuid;
  else
    update public.profiles set role = 'moderator' where user_id = v_mod_uuid;

    insert into public.moderator_permissions
      (user_id, can_delete_posts, can_delete_comments, can_ban_users, can_view_reports, assigned_by)
    values
      (v_mod_uuid, true, true, false, true, v_assigned_by)
    on conflict (user_id) do update
      set can_delete_posts    = excluded.can_delete_posts,
          can_delete_comments = excluded.can_delete_comments,
          can_ban_users       = excluded.can_ban_users,
          can_view_reports    = excluded.can_view_reports,
          assigned_by         = excluded.assigned_by;

    raise notice 'Moderator set for % (delete posts/comments + view reports; no ban).', v_mod_uuid;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. Verify — list every elevated account and any moderator flags.
-- ─────────────────────────────────────────────────────────────
select u.username,
       p.role,
       p.banned_at,
       mp.can_delete_posts,
       mp.can_delete_comments,
       mp.can_ban_users,
       mp.can_view_reports
from public.profiles p
join public.users u on u.id = p.user_id
left join public.moderator_permissions mp on mp.user_id = p.user_id
where p.role in ('admin', 'moderator')
order by p.role, u.username;
