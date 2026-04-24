import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/components/messages/chat-window';

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

  const [currentUserResult, partnerUserResult, partnerProfileResult, messagesResult] =
    await Promise.all([
      supabase.from('users').select('account_type').eq('id', user.id).single(),
      supabase.from('users').select('id, username, full_name').eq('id', partnerId).single(),
      supabase.from('profiles').select('avatar_url').eq('user_id', partnerId).maybeSingle(),
      supabase
        .from('messages')
        .select('id, sender_id, content, is_read, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50),
    ]);

  if (!partnerUserResult.data) notFound();

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
      initialMessages={messagesResult.data ?? []}
      initialCanReply={initialCanReply}
    />
  );
}
