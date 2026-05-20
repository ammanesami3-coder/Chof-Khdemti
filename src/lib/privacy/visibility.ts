import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether `senderId` may start a new conversation with `recipientId`,
 * honoring the recipient's `who_can_message` setting.
 *
 *   'everyone'  -> always allowed
 *   'followers' -> only if the sender follows the recipient
 *
 * A missing column (migration 0040 not applied) degrades to 'everyone'.
 * This only gates *new* conversations — existing threads are unaffected.
 */
export async function canStartConversation(
  supabase: ServerClient,
  senderId: string,
  recipientId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('who_can_message')
    .eq('user_id', recipientId)
    .single();

  const policy = (profile?.who_can_message as string | undefined) ?? 'everyone';
  if (policy !== 'followers') return true;

  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', senderId)
    .eq('following_id', recipientId);

  return (count ?? 0) > 0;
}
