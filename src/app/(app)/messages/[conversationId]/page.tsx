import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { ChatWindow } from '@/components/messages/chat-window';
import type { RepliedStatus, MessageReaction, RepliedMessage } from '@/components/messages/chat-window';
import type { AttachmentMetadata } from '@/lib/actions/messages';

export const metadata = { title: 'المحادثة — Chof Khdemti' };

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const { supabase, user } = await requireUser();

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, artisan_id, customer_id')
    .eq('id', conversationId)
    .single();

  if (!conv) notFound();
  if (conv.artisan_id !== user.id && conv.customer_id !== user.id) notFound();

  const isArtisan = conv.artisan_id === user.id;
  const partnerId = isArtisan ? conv.customer_id : conv.artisan_id;

  const [currentUserResult, currentProfileResult, partnerUserResult, partnerProfileResult, rawMessagesResult, partnerSubResult] =
    await Promise.all([
      supabase.from('users').select('account_type').eq('id', user.id).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle(),
      supabase.from('users').select('id, username, full_name').eq('id', partnerId).single(),
      supabase.from('profiles').select('avatar_url, last_seen_at, last_seen_hidden').eq('user_id', partnerId).maybeSingle(),
      // Fetch the LATEST 50 messages (desc) then reverse for chronological display.
      // Ascending + limit(50) would return the oldest 50, causing new messages to
      // vanish after refresh in conversations with more than 50 messages.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('messages')
        .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, reply_to_status_id, shared_post_id, reply_to_message_id, deleted_at, deleted_for_everyone, deleted_by_user_ids, attachment_url, attachment_metadata')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50) as Promise<{ data: RawMessage[] | null }>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).rpc('get_subscribed_user_ids', { p_user_ids: [partnerId] }) as Promise<{ data: string[] | null }>,
    ]);

  if (!partnerUserResult.data) notFound();

  // Reverse: we fetched newest-first (desc), render oldest-first (asc)
  const rawMessages: RawMessage[] = (rawMessagesResult.data ?? []).reverse();
  const messageIds = rawMessages.map((m) => m.id);

  // ── Enrich: status replies ─────────────────────────────────────────────────
  const replyStatusIds = [
    ...new Set(rawMessages.map((m) => m.reply_to_status_id).filter((id): id is string => !!id)),
  ];

  const statusDataMap = new Map<string, RepliedStatus>();
  if (replyStatusIds.length > 0) {
    const { data: statuses } = await supabase
      .from('status_updates')
      .select('id, content_type, content, media_url, thumbnail_url, background_color, text_color, expires_at, user_id')
      .in('id', replyStatusIds);

    if (statuses?.length) {
      const statusUserIds = [...new Set(statuses.map((s) => s.user_id))];
      const { data: statusUsers } = await supabase
        .from('users').select('id, username, full_name').in('id', statusUserIds);

      const usersMap = new Map((statusUsers ?? []).map((u) => [u.id, u]));

      for (const s of statuses) {
        const u = usersMap.get(s.user_id);
        statusDataMap.set(s.id, {
          content_type:     s.content_type as 'text' | 'image' | 'video',
          content:          s.content ?? null,
          media_url:        s.media_url ?? null,
          thumbnail_url:    s.thumbnail_url ?? null,
          background_color: (s.background_color as string) ?? '#1877F2',
          text_color:       (s.text_color as string) ?? '#FFFFFF',
          user_username:    u?.username ?? '',
          user_full_name:   u?.full_name ?? '',
          expires_at:       s.expires_at ?? null,
        });
      }
    }
  }

  // ── Enrich: message replies ────────────────────────────────────────────────
  const replyMsgIds = [
    ...new Set(rawMessages.map((m) => m.reply_to_message_id).filter((id): id is string => !!id)),
  ];

  const repliedMsgMap = new Map<string, RepliedMessage>();
  if (replyMsgIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: repliedMsgs } = await (supabase as any)
      .from('messages')
      .select('id, sender_id, content, message_type, voice_url, deleted_for_everyone')
      .in('id', replyMsgIds) as { data: RepliedMessage[] | null };

    for (const m of repliedMsgs ?? []) {
      repliedMsgMap.set(m.id, m);
    }
  }

  // ── Enrich: shared posts ──────────────────────────────────────────────────
  type SharedPostData = {
    content: string | null;
    media: Array<{ type: string; url: string; thumbnail: string }>;
    author_full_name: string;
    author_username:  string;
  };

  const sharedPostIds = [
    ...new Set(
      rawMessages
        .filter((m) => m.message_type === 'post_share' && m.shared_post_id)
        .map((m) => m.shared_post_id!),
    ),
  ];

  const sharedPostMap = new Map<string, SharedPostData>();
  if (sharedPostIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, content, media, author_id')
      .in('id', sharedPostIds);

    if (posts?.length) {
      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      const { data: authors } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', authorIds);

      const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

      for (const p of posts) {
        const author = authorMap.get(p.author_id);
        sharedPostMap.set(p.id, {
          content:          p.content ?? null,
          media:            (p.media as Array<{ type: string; url: string; thumbnail: string }>) ?? [],
          author_full_name: author?.full_name ?? '',
          author_username:  author?.username ?? '',
        });
      }
    }
  }

  // ── Enrich: reactions ──────────────────────────────────────────────────────
  const reactionsMap = new Map<string, MessageReaction[]>();
  if (messageIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reactions } = await (supabase as any)
      .from('message_reactions')
      .select('message_id, emoji, user_id')
      .in('message_id', messageIds) as { data: (MessageReaction & { message_id: string })[] | null };

    for (const r of reactions ?? []) {
      const list = reactionsMap.get(r.message_id) ?? [];
      list.push({ emoji: r.emoji, user_id: r.user_id });
      reactionsMap.set(r.message_id, list);
    }
  }

  // ── Assemble initialMessages ───────────────────────────────────────────────
  const initialMessages = rawMessages.map((m) => ({
    id:                   m.id,
    sender_id:            m.sender_id,
    content:              m.content,
    is_read:              m.is_read,
    created_at:           m.created_at,
    message_type:         (m.message_type ?? 'text') as 'text' | 'voice' | 'post_share' | 'image' | 'video' | 'document' | 'audio' | 'location',
    voice_url:            m.voice_url ?? null,
    voice_duration:       m.voice_duration ?? null,
    shared_post_id:       m.shared_post_id ?? null,
    shared_post_data:     m.shared_post_id ? (sharedPostMap.get(m.shared_post_id) ?? null) : null,
    reply_to_status_id:   m.reply_to_status_id ?? null,
    replied_status:       m.reply_to_status_id ? (statusDataMap.get(m.reply_to_status_id) ?? null) : null,
    reply_to_message_id:  m.reply_to_message_id ?? null,
    replied_message:      m.reply_to_message_id ? (repliedMsgMap.get(m.reply_to_message_id) ?? null) : null,
    reactions:            reactionsMap.get(m.id) ?? [],
    deleted_at:            m.deleted_at ?? null,
    deleted_for_everyone:  m.deleted_for_everyone ?? false,
    deleted_by_user_ids:   m.deleted_by_user_ids ?? [],
    attachment_url:        m.attachment_url ?? null,
    attachment_metadata:  (m.attachment_metadata ?? null) as AttachmentMetadata | null,
  }));

  const partner = {
    id:           partnerUserResult.data.id,
    username:     partnerUserResult.data.username,
    full_name:    partnerUserResult.data.full_name,
    avatar_url:   partnerProfileResult.data?.avatar_url ?? null,
    is_subscribed: (partnerSubResult.data ?? []).includes(partnerId),
    last_seen_at: partnerProfileResult.data?.last_seen_hidden
      ? null
      : (partnerProfileResult.data?.last_seen_at ?? null),
  };

  let initialCanReply = true;
  if (isArtisan) {
    const { data } = await supabase.rpc('can_artisan_reply', { p_artisan_id: user.id });
    initialCanReply = data ?? false;
  }

  return (
    <ChatWindow
      conversationId={conversationId}
      currentUserId={user.id}
      currentUserAvatarUrl={currentProfileResult.data?.avatar_url ?? null}
      accountType={currentUserResult.data?.account_type ?? 'customer'}
      partner={partner}
      initialMessages={initialMessages}
      initialCanReply={initialCanReply}
    />
  );
}

// ── local raw type (mirrors DB columns) ────────────────────────────────────────
type RawMessage = {
  id:                   string;
  sender_id:            string;
  content:              string | null;
  is_read:              boolean;
  created_at:           string;
  message_type:         string | null;
  voice_url:            string | null;
  voice_duration:       number | null;
  reply_to_status_id:   string | null;
  shared_post_id:       string | null;
  reply_to_message_id:  string | null;
  deleted_at:            string | null;
  deleted_for_everyone:  boolean;
  deleted_by_user_ids:   string[];
  attachment_url:        string | null;
  attachment_metadata:  Record<string, unknown> | null;
};
