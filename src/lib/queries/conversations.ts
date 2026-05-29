'use server';

import { createClient } from '@/lib/supabase/server';

// النوع المُرجَع من دالة get_user_conversations()
export type ConversationRow = {
  id: string;
  artisan_id: string;
  customer_id: string;
  last_message_at: string;
  created_at: string;
  partner_id: string;
  partner_username: string;
  partner_full_name: string;
  partner_avatar_url: string | null;
  partner_is_subscribed?: boolean;
  last_message_content: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null;
  last_message_is_read: boolean | null;
  unread_count: number;
  // conversation_settings columns (null before migration runs)
  is_pinned:   boolean;
  pinned_at:   string | null;
  is_muted:    boolean;
  muted_until: string | null;
};

export async function fetchUserConversations(): Promise<ConversationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_user_conversations');

  if (error) {
    console.error('fetchUserConversations error:', error.message);
    return [];
  }

  const rows = (data ?? []) as ConversationRow[];
  if (rows.length === 0) return rows;

  // Enrich with each partner's subscription status (for the badge).
  const partnerIds = [...new Set(rows.map((r) => r.partner_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subIds } = await (supabase as any).rpc('get_subscribed_user_ids', {
    p_user_ids: partnerIds,
  }) as { data: string[] | null };
  const subscribedSet = new Set<string>(subIds ?? []);

  return rows.map((r) => ({ ...r, partner_is_subscribed: subscribedSet.has(r.partner_id) }));
}
