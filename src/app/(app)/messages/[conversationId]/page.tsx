import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow, type RepliedStatus } from '@/components/messages/chat-window';

export const metadata = { title: 'المحادثة — Chof Khdemti' };

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS blocks access if user is not a party, but check explicitly too
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, artisan_id, customer_id')
    .eq('id', conversationId)
    .single();

  if (!conv) notFound();
  if (conv.artisan_id !== user.id && conv.customer_id !== user.id) notFound();

  const isArtisan = conv.artisan_id === user.id;
  const partnerId = isArtisan ? conv.customer_id : conv.artisan_id;

  const [currentUserResult, partnerUserResult, partnerProfileResult, rawMessagesResult] =
    await Promise.all([
      supabase.from('users').select('account_type').eq('id', user.id).single(),
      supabase.from('users').select('id, username, full_name').eq('id', partnerId).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', partnerId).maybeSingle(),
      supabase
        .from('messages')
        .select('id, sender_id, content, is_read, created_at, message_type, voice_url, voice_duration, reply_to_status_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50),
    ]);

  if (!partnerUserResult.data) notFound();

  // Enrich messages that are status replies with the referenced status data
  const rawMessages = rawMessagesResult.data ?? [];
  const replyStatusIds = [
    ...new Set(rawMessages.map((m) => m.reply_to_status_id).filter((id): id is string => !!id)),
  ];

  const statusDataMap = new Map<string, RepliedStatus>();
  if (replyStatusIds.length > 0) {
    const { data: statuses } = await supabase
      .from('status_updates')
      .select('id, content_type, content, media_url, thumbnail_url, background_color, text_color, user_id')
      .in('id', replyStatusIds);

    if (statuses?.length) {
      const statusUserIds = [...new Set(statuses.map((s) => s.user_id))];
      const { data: statusUsers } = await supabase
        .from('users')
        .select('id, username, full_name')
        .in('id', statusUserIds);

      const statusUsersMap = new Map((statusUsers ?? []).map((u) => [u.id, u]));

      for (const s of statuses) {
        const u = statusUsersMap.get(s.user_id);
        statusDataMap.set(s.id, {
          content_type: s.content_type as 'text' | 'image' | 'video',
          content: s.content ?? null,
          media_url: s.media_url ?? null,
          thumbnail_url: s.thumbnail_url ?? null,
          background_color: (s.background_color as string) ?? '#1877F2',
          text_color: (s.text_color as string) ?? '#FFFFFF',
          user_username: u?.username ?? '',
          user_full_name: u?.full_name ?? '',
        });
      }
    }
  }

  const initialMessages = rawMessages.map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    is_read: m.is_read,
    created_at: m.created_at,
    message_type: (m.message_type ?? 'text') as 'text' | 'voice',
    voice_url: m.voice_url ?? null,
    voice_duration: m.voice_duration ?? null,
    reply_to_status_id: m.reply_to_status_id ?? null,
    replied_status: m.reply_to_status_id ? (statusDataMap.get(m.reply_to_status_id) ?? null) : null,
  }));

  const partner = {
    id: partnerUserResult.data.id,
    username: partnerUserResult.data.username,
    full_name: partnerUserResult.data.full_name,
    avatar_url: partnerProfileResult.data?.avatar_url ?? null,
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
      accountType={currentUserResult.data?.account_type ?? 'customer'}
      partner={partner}
      initialMessages={initialMessages}
      initialCanReply={initialCanReply}
    />
  );
}
