'use server';

import { createClient } from '@/lib/supabase/server';

export type ModerationCaps = {
  isAdmin: boolean;
  canDeletePosts: boolean;
  canDeleteComments: boolean;
  canBanUsers: boolean;
  canViewReports: boolean;
};

const NO_CAPS: ModerationCaps = {
  isAdmin: false,
  canDeletePosts: false,
  canDeleteComments: false,
  canBanUsers: false,
  canViewReports: false,
};

/**
 * Resolve the current user's moderation capabilities.
 * Admins get everything; moderators get exactly their granular flags from
 * moderator_permissions; everyone else gets nothing. Safe for guests.
 */
export async function getModerationCapabilities(): Promise<ModerationCaps> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NO_CAPS;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = profile?.role ?? 'user';

  if (role === 'admin') {
    return {
      isAdmin: true,
      canDeletePosts: true,
      canDeleteComments: true,
      canBanUsers: true,
      canViewReports: true,
    };
  }

  if (role !== 'moderator') return NO_CAPS;

  const { data: perms } = await supabase
    .from('moderator_permissions')
    .select('can_delete_posts, can_delete_comments, can_ban_users, can_view_reports')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    isAdmin: false,
    canDeletePosts: perms?.can_delete_posts ?? false,
    canDeleteComments: perms?.can_delete_comments ?? false,
    canBanUsers: perms?.can_ban_users ?? false,
    canViewReports: perms?.can_view_reports ?? false,
  };
}

/**
 * Resolve a user's moderation role ('user' | 'artisan' | 'moderator' | 'admin').
 * Used by the moderation toolbar to hide destructive actions when a moderator
 * is looking at admin-owned content (the RPCs enforce this server-side too).
 */
export async function getUserRole(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.role ?? 'user';
}

type ActionResult = { success: boolean; error?: string };

/** Delete a post as a moderator (RPC enforces can_delete_posts / admin). */
export async function moderatorDeletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('moderator_delete_post', {
    p_post_id: postId,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Delete a comment as a moderator (RPC enforces can_delete_comments / admin). */
export async function moderatorDeleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('moderator_delete_comment', {
    p_comment_id: commentId,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Ban a user as a moderator (RPC enforces can_ban_users / admin + guards). */
export async function moderatorBanUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('moderator_ban_user', {
    p_user_id: userId,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
