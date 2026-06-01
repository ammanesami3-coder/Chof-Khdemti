'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ── Shared types ────────────────────────────────────────────────────────────

export type ModPerms = {
  can_delete_posts: boolean;
  can_delete_comments: boolean;
  can_ban_users: boolean;
  can_view_reports: boolean;
};

export type ModeratorRow = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  permissions: ModPerms;
};

export type UserSearchRow = {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
};

type ActionResult<T = undefined> = { success: boolean; error?: string; data?: T };

const DEFAULT_PERMS: ModPerms = {
  can_delete_posts: false,
  can_delete_comments: false,
  can_ban_users: false,
  can_view_reports: true,
};

// ── Admin gate ──────────────────────────────────────────────────────────────

/**
 * Verify the current request comes from a platform admin. Returns the admin's
 * user id on success, or null when the caller is not an admin. Read goes
 * through RLS (an admin can always read their own profile).
 */
async function getAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return profile?.role === 'admin' ? user.id : null;
}

/** Whether the current viewer is a platform admin (for client-side gating). */
export async function getIsAdmin(): Promise<boolean> {
  return (await getAdminId()) !== null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All current moderators with their granular permission flags. Admin only. */
export async function listModerators(): Promise<ModeratorRow[]> {
  const adminId = await getAdminId();
  if (!adminId) return [];

  // Service role: read across users/profiles/permissions without per-table RLS.
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, avatar_url')
    .eq('role', 'moderator');

  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.user_id);

  const [{ data: users }, { data: perms }] = await Promise.all([
    supabaseAdmin.from('users').select('id, username, full_name').in('id', ids),
    supabaseAdmin
      .from('moderator_permissions')
      .select('user_id, can_delete_posts, can_delete_comments, can_ban_users, can_view_reports')
      .in('user_id', ids),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const permMap = new Map((perms ?? []).map((p) => [p.user_id, p]));

  return profiles
    .map((p) => {
      const u = userMap.get(p.user_id);
      if (!u) return null;
      const mp = permMap.get(p.user_id);
      return {
        user_id: p.user_id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: p.avatar_url,
        permissions: {
          can_delete_posts: mp?.can_delete_posts ?? false,
          can_delete_comments: mp?.can_delete_comments ?? false,
          can_ban_users: mp?.can_ban_users ?? false,
          can_view_reports: mp?.can_view_reports ?? false,
        },
      } satisfies ModeratorRow;
    })
    .filter((r): r is ModeratorRow => r !== null);
}

/**
 * Search users to appoint as moderators (by username or full name). Admin only.
 * Excludes existing admins (cannot be demoted through this tool).
 */
export async function searchUsersForAppoint(query: string): Promise<UserSearchRow[]> {
  const adminId = await getAdminId();
  if (!adminId) return [];

  const term = query.trim();
  if (term.length < 2) return [];

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name')
    .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
    .limit(15);

  if (!users || users.length === 0) return [];

  const ids = users.map((u) => u.id);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, avatar_url, role')
    .in('user_id', ids);

  const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return users
    .map((u) => {
      const p = profMap.get(u.id);
      const role = p?.role ?? 'user';
      if (role === 'admin') return null; // never surface admins for demotion
      return {
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        avatar_url: p?.avatar_url ?? null,
        role,
      } satisfies UserSearchRow;
    })
    .filter((r): r is UserSearchRow => r !== null);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'invalid_username'),
});

const permsSchema = z.object({
  can_delete_posts: z.boolean(),
  can_delete_comments: z.boolean(),
  can_ban_users: z.boolean(),
  can_view_reports: z.boolean(),
});

/**
 * Create a brand-new moderator account (auth user + profile) and grant the
 * requested permissions. Admin only.
 */
export async function createModeratorAccount(input: {
  email: string;
  password: string;
  username: string;
  permissions?: ModPerms;
}): Promise<ActionResult<{ userId: string }>> {
  const adminId = await getAdminId();
  if (!adminId) return { success: false, error: 'Unauthorized' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid input' };
  const { email, password, username } = parsed.data;
  const permissions = permsSchema.safeParse(input.permissions ?? DEFAULT_PERMS);
  const perms = permissions.success ? permissions.data : DEFAULT_PERMS;

  // Create the auth user. The on_auth_user_created trigger fires synchronously
  // and provisions public.users + public.profiles from the metadata below.
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      full_name: username,
      account_type: 'customer',
    },
  });

  if (createErr || !created?.user) {
    return { success: false, error: createErr?.message ?? 'Could not create account' };
  }

  const newId = created.user.id;

  // Elevate to moderator + grant permissions (service role bypasses RLS).
  const { error: roleErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'moderator' })
    .eq('user_id', newId);
  if (roleErr) {
    return { success: false, error: roleErr.message };
  }

  const { error: permErr } = await supabaseAdmin
    .from('moderator_permissions')
    .upsert({ user_id: newId, ...perms, assigned_by: adminId }, { onConflict: 'user_id' });
  if (permErr) {
    return { success: false, error: permErr.message };
  }

  revalidatePath('/settings/moderators');
  return { success: true, data: { userId: newId } };
}

/**
 * Appoint an existing user as a moderator with the given permissions. Admin
 * only. Refuses to touch admin accounts.
 */
export async function appointModerator(
  userId: string,
  perms: ModPerms,
): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { success: false, error: 'Unauthorized' };

  const parsed = permsSchema.safeParse(perms);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (!target) return { success: false, error: 'User not found' };
  if (target.role === 'admin') {
    return { success: false, error: 'Cannot modify an admin account' };
  }

  const { error: roleErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'moderator' })
    .eq('user_id', userId);
  if (roleErr) return { success: false, error: roleErr.message };

  const { error: permErr } = await supabaseAdmin
    .from('moderator_permissions')
    .upsert({ user_id: userId, ...parsed.data, assigned_by: adminId }, { onConflict: 'user_id' });
  if (permErr) return { success: false, error: permErr.message };

  revalidatePath('/settings/moderators');
  return { success: true };
}

/** Update an existing moderator's granular permissions. Admin only. */
export async function updateModeratorPermissions(
  userId: string,
  perms: ModPerms,
): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { success: false, error: 'Unauthorized' };

  const parsed = permsSchema.safeParse(perms);
  if (!parsed.success) return { success: false, error: 'Invalid input' };

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (target?.role !== 'moderator') {
    return { success: false, error: 'User is not a moderator' };
  }

  const { error } = await supabaseAdmin
    .from('moderator_permissions')
    .upsert({ user_id: userId, ...parsed.data, assigned_by: adminId }, { onConflict: 'user_id' });
  if (error) return { success: false, error: error.message };

  revalidatePath('/settings/moderators');
  return { success: true };
}

/**
 * Revoke a user's moderator status. Restores their base role (artisan if their
 * account_type is artisan, otherwise user) and drops their permission row.
 * Admin only; refuses to touch admins.
 */
export async function revokeModerator(userId: string): Promise<ActionResult> {
  const adminId = await getAdminId();
  if (!adminId) return { success: false, error: 'Unauthorized' };

  const [{ data: profile }, { data: account }] = await Promise.all([
    supabaseAdmin.from('profiles').select('role').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('users').select('account_type').eq('id', userId).maybeSingle(),
  ]);

  if (profile?.role === 'admin') {
    return { success: false, error: 'Cannot modify an admin account' };
  }

  const baseRole = account?.account_type === 'artisan' ? 'artisan' : 'user';

  const { error: roleErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: baseRole })
    .eq('user_id', userId);
  if (roleErr) return { success: false, error: roleErr.message };

  const { error: delErr } = await supabaseAdmin
    .from('moderator_permissions')
    .delete()
    .eq('user_id', userId);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath('/settings/moderators');
  return { success: true };
}
