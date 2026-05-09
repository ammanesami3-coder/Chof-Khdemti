'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'] as const;

const sendSchema = z.object({
  conversationId:    z.string().uuid(),
  content:           z.string().min(1).max(5000),
  replyToMessageId:  z.string().uuid().nullable().optional(),
});

const ATTACHMENT_TYPES = ['image', 'video', 'document', 'audio'] as const;
type AttachmentType = typeof ATTACHMENT_TYPES[number];

const attachmentSchema = z.object({
  conversationId:    z.string().uuid(),
  attachmentUrl:     z.string().url(),
  messageType:       z.enum(ATTACHMENT_TYPES),
  metadata:          z.record(z.string(), z.unknown()),
  caption:           z.string().max(1000).nullable().optional(),
  replyToMessageId:  z.string().uuid().nullable().optional(),
});

const voiceSchema = z.object({
  conversationId: z.string().uuid(),
  voiceUrl:       z.string().url(),
  voiceDuration:  z.number().int().min(0).max(600),
});

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji:     z.string(),
});

const deleteSchema = z.object({
  messageId:    z.string().uuid(),
  forEveryone:  z.boolean(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageReaction = {
  emoji:   string;
  user_id: string;
};

export type AttachmentMetadata = {
  filename?:      string;
  size?:          number;
  mime_type?:     string;
  width?:         number;
  height?:        number;
  duration?:      number;
  thumbnail_url?: string;
};

export type SentMessage = {
  id:                   string;
  sender_id:            string;
  content:              string | null;
  is_read:              boolean;
  created_at:           string;
  message_type:         'text' | 'voice' | 'post_share' | 'image' | 'video' | 'document' | 'audio' | 'location';
  voice_url:            string | null;
  voice_duration:       number | null;
  shared_post_id:       string | null;
  reply_to_message_id:  string | null;
  deleted_for_everyone: boolean;
  attachment_url:       string | null;
  attachment_metadata:  AttachmentMetadata | null;
  reactions:            MessageReaction[];
};

// ── Helper: verify conversation membership ────────────────────────────────────

async function verifyConversationMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  userId: string,
) {
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('artisan_id, customer_id')
    .eq('id', conversationId)
    .single();

  if (error || !conv) return { conv: null, isArtisan: false, isCustomer: false };

  const isArtisan  = conv.artisan_id  === userId;
  const isCustomer = conv.customer_id === userId;
  return { conv, isArtisan, isCustomer };
}

// ── sendMessage ───────────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId:   string,
  content:          string,
  replyToMessageId?: string | null,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = sendSchema.safeParse({ conversationId, content: content.trim(), replyToMessageId });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { conv, isArtisan, isCustomer } = await verifyConversationMember(
    supabase, parsed.data.conversationId, user.id
  );
  if (!conv || (!isArtisan && !isCustomer)) return { error: 'غير مصرح' };

  if (isArtisan) {
    const { data: canReply } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    if (!canReply) return { error: 'subscription_required' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: insertErr } = await (supabase as any)
    .from('messages')
    .insert({
      conversation_id:     parsed.data.conversationId,
      sender_id:           user.id,
      content:             parsed.data.content,
      message_type:        'text',
      reply_to_message_id: parsed.data.replyToMessageId ?? null,
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, shared_post_id, reply_to_message_id, deleted_for_everyone')
    .single() as { data: Omit<SentMessage, 'reactions' | 'attachment_url' | 'attachment_metadata'> | null; error: { message: string } | null };

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

  return { data: { ...message, attachment_url: null, attachment_metadata: null, reactions: [] } };
}

// ── sendVoiceMessage ──────────────────────────────────────────────────────────

export async function sendVoiceMessage(
  conversationId: string,
  voiceUrl:        string,
  voiceDuration:   number,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = voiceSchema.safeParse({ conversationId, voiceUrl, voiceDuration });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { conv, isArtisan, isCustomer } = await verifyConversationMember(
    supabase, parsed.data.conversationId, user.id
  );
  if (!conv || (!isArtisan && !isCustomer)) return { error: 'غير مصرح' };

  if (isArtisan) {
    const { data: canReply } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    if (!canReply) return { error: 'subscription_required' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: insertErr } = await (supabase as any)
    .from('messages')
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id:       user.id,
      content:         null,
      message_type:    'voice',
      voice_url:       parsed.data.voiceUrl,
      voice_duration:  parsed.data.voiceDuration,
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, shared_post_id, reply_to_message_id, deleted_for_everyone')
    .single() as { data: Omit<SentMessage, 'reactions' | 'attachment_url' | 'attachment_metadata'> | null; error: { message: string } | null };

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

  return { data: { ...message, attachment_url: null, attachment_metadata: null, reactions: [] } };
}

// ── sendAttachmentMessage ─────────────────────────────────────────────────────

export async function sendAttachmentMessage(
  conversationId:   string,
  attachmentUrl:    string,
  messageType:      AttachmentType,
  metadata:         AttachmentMetadata,
  caption?:         string | null,
  replyToMessageId?: string | null,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = attachmentSchema.safeParse({
    conversationId, attachmentUrl, messageType, metadata: metadata as Record<string, unknown>,
    caption, replyToMessageId,
  });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { conv, isArtisan, isCustomer } = await verifyConversationMember(
    supabase, parsed.data.conversationId, user.id
  );
  if (!conv || (!isArtisan && !isCustomer)) return { error: 'غير مصرح' };

  if (isArtisan) {
    const { data: canReply } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    if (!canReply) return { error: 'subscription_required' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: insertErr } = await (supabase as any)
    .from('messages')
    .insert({
      conversation_id:      parsed.data.conversationId,
      sender_id:            user.id,
      content:              parsed.data.caption ?? null,
      message_type:         parsed.data.messageType,
      attachment_url:       parsed.data.attachmentUrl,
      attachment_metadata:  metadata,
      reply_to_message_id:  parsed.data.replyToMessageId ?? null,
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, shared_post_id, reply_to_message_id, deleted_for_everyone, attachment_url, attachment_metadata')
    .single() as { data: Omit<SentMessage, 'reactions'> | null; error: { message: string } | null };

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };

  return { data: { ...message, reactions: [] } };
}

// ── toggleMessageReaction ─────────────────────────────────────────────────────

export async function toggleMessageReaction(
  messageId: string,
  emoji:      string,
): Promise<{ error?: string; action?: 'added' | 'removed' | 'changed' }> {
  const parsed = reactionSchema.safeParse({ messageId, emoji });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  if (!VALID_EMOJIS.includes(emoji as typeof VALID_EMOJIS[number])) {
    return { error: 'رمز تعبيري غير مدعوم' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  // Check existing reaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('message_reactions')
    .select('id, emoji')
    .eq('message_id', parsed.data.messageId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: string; emoji: string } | null };

  if (existing) {
    if (existing.emoji === emoji) {
      // Same emoji → remove
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('message_reactions').delete().eq('id', existing.id);
      return { action: 'removed' };
    }
    // Different emoji → update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('message_reactions')
      .update({ emoji })
      .eq('id', existing.id);
    return { action: 'changed' };
  }

  // New reaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('message_reactions').insert({
    message_id: parsed.data.messageId,
    user_id:    user.id,
    emoji,
  });

  if (error) return { error: error.message };
  return { action: 'added' };
}

// ── deleteMessage ─────────────────────────────────────────────────────────────

export async function deleteMessage(
  messageId:   string,
  forEveryone: boolean,
): Promise<{ error?: string }> {
  const parsed = deleteSchema.safeParse({ messageId, forEveryone });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  if (parsed.data.forEveryone) {
    // Only the original sender can delete for everyone, within 60 minutes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: msg } = await (supabase as any)
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', parsed.data.messageId)
      .maybeSingle() as { data: { sender_id: string; created_at: string } | null };

    if (!msg || msg.sender_id !== user.id) return { error: 'غير مصرح' };

    const sentAt = new Date(msg.created_at).getTime();
    if (Date.now() - sentAt > 60 * 60 * 1000) {
      return { error: 'انتهت مهلة حذف الرسالة للجميع (60 دقيقة)' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('messages')
      .update({ deleted_for_everyone: true, content: null, attachment_url: null, attachment_metadata: null })
      .eq('id', parsed.data.messageId);

    if (updateErr) return { error: updateErr.message };
  } else {
    // Delete for me: any conversation party can delete from their own view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc('mark_message_deleted_for_me', {
      p_message_id: parsed.data.messageId,
    });
    if (error) return { error: (error as { message: string }).message };
  }

  return {};
}

// ── sendLocationMessage ───────────────────────────────────────────────────────

const locationSchema = z.object({
  conversationId: z.string().uuid(),
  lat:            z.number().min(-90).max(90),
  lng:            z.number().min(-180).max(180),
  name:           z.string().max(200),
});

export async function sendLocationMessage(
  conversationId: string,
  lat:            number,
  lng:            number,
  name:           string,
): Promise<{ data: SentMessage; error?: never } | { error: string; data?: never }> {
  const parsed = locationSchema.safeParse({ conversationId, lat, lng, name });
  if (!parsed.success) return { error: 'مدخلات غير صالحة' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { conv, isArtisan, isCustomer } = await verifyConversationMember(
    supabase, parsed.data.conversationId, user.id,
  );
  if (!conv || (!isArtisan && !isCustomer)) return { error: 'غير مصرح' };

  if (isArtisan) {
    const { data: canReply } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    if (!canReply) return { error: 'subscription_required' };
  }

  const locationJson = JSON.stringify({
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    name: parsed.data.name,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: message, error: insertErr } = await (supabase as any)
    .from('messages')
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id:       user.id,
      content:         locationJson,
      message_type:    'location',
    })
    .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, shared_post_id, reply_to_message_id, deleted_for_everyone')
    .single() as { data: Omit<SentMessage, 'reactions' | 'attachment_url' | 'attachment_metadata'> | null; error: { message: string } | null };

  if (insertErr || !message) return { error: insertErr?.message ?? 'خطأ في الإرسال' };
  return { data: { ...message, attachment_url: null, attachment_metadata: null, reactions: [] } };
}

// ── markConversationRead ──────────────────────────────────────────────────────

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('mark_messages_read', {
    p_conversation_id: conversationId,
    p_reader_id:       user.id,
  });
}
