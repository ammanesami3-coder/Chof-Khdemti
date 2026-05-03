'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const voiceSchema = z.object({
  conversationId: z.string().uuid(),
  voiceUrl: z.string().url(),
  voiceDuration: z.number().int().min(0).max(600),
});

export type SentMessage = {
  id: string;
  sender_id: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
  message_type: 'text' | 'voice';
  voice_url: string | null;
  voice_duration: number | null;
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
      message_type: 'text',
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration')
    .single();

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

  return { data: message as SentMessage };
}

export async function sendVoiceMessage(
  conversationId: string,
  voiceUrl: string,
  voiceDuration: number,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = voiceSchema.safeParse({ conversationId, voiceUrl, voiceDuration });
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
    const { data: canReply } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    if (!canReply) return { error: 'subscription_required' };
  }

  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      content: null,
      message_type: 'voice',
      voice_url: parsed.data.voiceUrl,
      voice_duration: parsed.data.voiceDuration,
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration')
    .single();

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

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
