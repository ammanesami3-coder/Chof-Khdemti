'use server';

import { createClient } from '@/lib/supabase/server';

export type MuteDuration = '1h' | '8h' | '24h' | 'forever';

type Result = { error?: string };

async function upsertSettings(
  conversationId: string,
  patch: Record<string, unknown>,
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('conversation_settings')
    .upsert(
      { user_id: user.id, conversation_id: conversationId, ...patch },
      { onConflict: 'user_id,conversation_id' },
    );

  if (error) {
    console.error('[conv-settings] upsert error:', error.message);
    return { error: error.message };
  }
  return {};
}

export async function pinConversation(conversationId: string): Promise<Result> {
  return upsertSettings(conversationId, {
    is_pinned: true,
    pinned_at:  new Date().toISOString(),
  });
}

export async function unpinConversation(conversationId: string): Promise<Result> {
  return upsertSettings(conversationId, {
    is_pinned: false,
    pinned_at: null,
  });
}

export async function muteConversation(
  conversationId: string,
  duration: MuteDuration,
): Promise<Result> {
  const hoursMap: Record<MuteDuration, number | null> = {
    '1h':    1,
    '8h':    8,
    '24h':   24,
    forever: null,
  };
  const hours = hoursMap[duration];
  const muted_until = hours ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;

  return upsertSettings(conversationId, { is_muted: true, muted_until });
}

export async function unmuteConversation(conversationId: string): Promise<Result> {
  return upsertSettings(conversationId, { is_muted: false, muted_until: null });
}

export async function markConversationAsRead(conversationId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Uses security definer function — bypasses the UPDATE-sender-only RLS policy
  // that blocks recipients from directly setting is_read on partner messages.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });

  if (error) return { error: error.message };
  return {};
}

export async function deleteConversationForMe(conversationId: string): Promise<Result> {
  return upsertSettings(conversationId, { deleted_at: new Date().toISOString() });
}
