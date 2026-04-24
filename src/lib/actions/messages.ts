'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

type SentMessage = {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = sendSchema.safeParse({ conversationId, content: content.trim() });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('artisan_id, customer_id')
    .eq('id', parsed.data.conversationId)
    .single();

  if (convErr || !conv) return { error: 'المحادثة غير موجودة' };

  const isArtisan = conv.artisan_id === user.id;
  const isCustomer = conv.customer_id === user.id;
  if (!isArtisan && !isCustomer) return { error: 'غير مصرح' };

  if (isArtisan) {
    const { data: canReply } = await supabase.rpc('can_artisan_reply', {
      p_artisan_id: user.id,
    });
    if (!canReply) return { error: 'subscription_required' };
  }

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      content: parsed.data.content,
    })
    .select('id, sender_id, content, is_read, created_at')
    .single();

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

  // last_message_at يُحدَّث تلقائياً بـ trigger trg_update_last_message_at (SECURITY DEFINER)

  return { data: message as SentMessage };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('mark_messages_read', {
    p_conversation_id: conversationId,
    p_reader_id: user.id,
  });
}
