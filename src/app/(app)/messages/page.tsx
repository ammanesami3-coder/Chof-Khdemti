import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationList } from '@/components/messages/conversation-list';

export const metadata = { title: 'الرسائل — Chof Khdemti' };

type Props = {
  searchParams: Promise<{ to?: string }>;
};

export default async function MessagesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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

    const artisan = artisanRes.data;
    const currentUser = currentUserRes.data;

    // Only customers can initiate conversations with artisans
    if (
      artisan?.account_type === 'artisan' &&
      artisan.id !== user.id &&
      currentUser?.account_type === 'customer'
    ) {
      // Try to find an existing conversation first
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('artisan_id', artisan.id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (existing) {
        redirect(`/messages/${existing.id}`);
      }

      // Create new conversation
      const { data: created } = await supabase
        .from('conversations')
        .insert({ artisan_id: artisan.id, customer_id: user.id })
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
