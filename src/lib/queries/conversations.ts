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
  last_message_content: string | null;
  last_message_created_at: string | null;
  last_message_sender_id: string | null;
  last_message_is_read: boolean | null;
  unread_count: number;
};

export async function fetchUserConversations(): Promise<ConversationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_user_conversations');

  if (error) {
    console.error('fetchUserConversations error:', error.message);
    return [];
  }

  return (data ?? []) as ConversationRow[];
}
