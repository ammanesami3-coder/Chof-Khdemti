import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Checks whether the current user can use subscription-gated features.
 *
 * - Customers → always allowed
 * - Artisans on active trial or paid subscription → allowed
 * - Artisans with expired/cancelled subscription → blocked
 *
 * Uses the DB function `can_artisan_reply` so the logic is in one place.
 */
export async function canUserInteract(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: userRow } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', userId)
    .single();

  if (!userRow || userRow.account_type !== 'artisan') return true;

  const { data: canReply } = await supabase.rpc('can_artisan_reply', {
    p_artisan_id: userId,
  });

  return !!canReply;
}

/**
 * Guard specific to comment / reply actions.
 *
 * New rules (updated):
 *  - Subscribed artisans          → can comment anywhere
 *  - Customers                    → can comment anywhere
 *  - Unsubscribed artisans        → can ONLY comment on artisan content:
 *      • Top-level comment: post must be by an artisan
 *      • Reply: parent comment must be authored by an artisan
 *
 * Throws Error('subscription_required') when the action is blocked.
 */
export async function requireCommentPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
  parentCommentId: string | null,
): Promise<void> {
  // 1. Get the commenter's account type
  const { data: userRow } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', userId)
    .single();

  // Customers can always comment
  if (!userRow || userRow.account_type !== 'artisan') return;

  // 2. Check artisan's subscription
  const { data: canReply } = await supabase.rpc('can_artisan_reply', {
    p_artisan_id: userId,
  });

  // Subscribed artisans (trial or active) can comment anywhere
  if (canReply) return;

  // 3. Unsubscribed artisan — determine target content author
  let targetAuthorId: string | null = null;

  if (parentCommentId) {
    // Reply: the relevant author is the parent comment's author
    const { data: parentComment } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', parentCommentId)
      .single();
    targetAuthorId = parentComment?.author_id ?? null;
  } else {
    // Top-level comment: the relevant author is the post author
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();
    targetAuthorId = post?.author_id ?? null;
  }

  if (!targetAuthorId) return; // Unknown target → fail open

  // 4. Check if the target author is a customer
  const { data: targetUser } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', targetAuthorId)
    .single();

  if (targetUser?.account_type === 'customer') {
    throw new Error('subscription_required');
  }
}
