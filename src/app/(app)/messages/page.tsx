import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { canStartConversation } from '@/lib/privacy/visibility';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'الرسائل — Chof Khdemti' };

type Props = {
  searchParams: Promise<{ to?: string }>;
};

export default async function MessagesPage({ searchParams }: Props) {
  const { supabase, user } = await requireUser();

  // Handle ?to=username: find/create conversation then redirect to it
  const { to } = await searchParams;
  if (to) {
    const [artisanRes, currentUserRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, account_type')
        .eq('username', to)
        .single(),
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

    if (isCustomerToArtisan || isCustomerToCustomer) {
      // recipient's id always goes in artisan_id — RLS policies work on either column.
      const artisanSlot = recipient!.id;

      // Try to find an existing conversation first
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('artisan_id', artisanSlot)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (existing) {
        redirect(`/messages/${existing.id}`);
      }

      // Honor the recipient's "who can message me" setting before opening a new thread.
      if (!(await canStartConversation(supabase, user.id, recipient!.id))) {
        redirect(`/profile/${to}`);
      }

      // Create new conversation
      const { data: created } = await supabase
        .from('conversations')
        .insert({ artisan_id: artisanSlot, customer_id: user.id })
        .select('id')
        .single();

      if (created) {
        redirect(`/messages/${created.id}`);
      }
    }
  }

  const conversations = await fetchUserConversations();

  return (
    <main className="mx-auto max-w-2xl">
      <div className="border-b px-4 py-4">
        <h1 className="text-xl font-bold">الرسائل</h1>
      </div>
      <ConversationList initialData={conversations} currentUserId={user.id} />
    </main>
  );
}
