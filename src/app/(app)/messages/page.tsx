import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { getCurrentAppUser } from '@/lib/supabase/get-current-user';
import { canStartConversation } from '@/lib/privacy/visibility';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationList } from '@/components/messages/conversation-list';
import { ConversationListSkeleton } from '@/components/messages/conversation-list-skeleton';
import { MessagesHeader } from '@/components/messages/messages-header';

export const metadata = { title: 'الرسائل — Chof Khdemti' };

type Props = {
  searchParams: Promise<{ to?: string }>;
};

/**
 * Resolve the `?to=username` deep-link: find or create the conversation and
 * redirect into it. This must complete before render (it navigates away), so
 * it stays on the page's critical path — but only when `to` is present.
 */
async function startConversationFor(to: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const [artisanRes, currentUserRes] = await Promise.all([
    supabase.from('users').select('id, account_type').eq('username', to).single(),
    supabase.from('users').select('account_type').eq('id', user.id).single(),
  ]);

  const recipient = artisanRes.data;
  const currentUser = currentUserRes.data;

  const isCustomerToArtisan =
    recipient?.account_type === 'artisan' &&
    recipient.id !== user.id &&
    currentUser?.account_type === 'customer';
  const isCustomerToCustomer =
    recipient?.account_type === 'customer' &&
    recipient.id !== user.id &&
    currentUser?.account_type === 'customer';

  if (!(isCustomerToArtisan || isCustomerToCustomer)) return;

  // recipient's id always goes in artisan_id — RLS policies work on either column.
  const artisanSlot = recipient!.id;

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('artisan_id', artisanSlot)
    .eq('customer_id', user.id)
    .maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);

  // Honor the recipient's "who can message me" setting before opening a thread.
  if (!(await canStartConversation(supabase, user.id, recipient!.id))) {
    redirect(`/profile/${to}`);
  }

  const { data: created } = await supabase
    .from('conversations')
    .insert({ artisan_id: artisanSlot, customer_id: user.id })
    .select('id')
    .single();
  if (created) redirect(`/messages/${created.id}`);
}

/** Streams the conversation list. The only part of the page that touches the DB. */
async function ConversationsData() {
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect('/login');

  const conversations = await fetchUserConversations();
  return <ConversationList initialData={conversations} currentUserId={appUser.id} />;
}

export default async function MessagesPage({ searchParams }: Props) {
  const { to } = await searchParams;
  if (to) await startConversationFor(to);

  // Header + wrapper paint instantly; the conversation list streams in behind a
  // skeleton inside the Suspense boundary.
  return (
    <main className="mx-auto max-w-2xl">
      <MessagesHeader />
      <Suspense fallback={<ConversationListSkeleton />}>
        <ConversationsData />
      </Suspense>
    </main>
  );
}
