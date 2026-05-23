import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { canStartConversation } from '@/lib/privacy/visibility';

type Props = {
  searchParams: Promise<{ to?: string }>;
};

export default async function NewConversationPage({ searchParams }: Props) {
  const { to } = await searchParams;
  if (!to) redirect('/messages');

  const { supabase, user } = await requireUser();

  const [targetRes, currentUserRes] = await Promise.all([
    supabase.from('users').select('id, account_type').eq('username', to).single(),
    supabase.from('users').select('account_type').eq('id', user.id).single(),
  ]);

  const target = targetRes.data;
  const currentUser = currentUserRes.data;

  if (!target) notFound();

  // Cannot message yourself
  if (target.id === user.id) redirect('/messages');

  const isCustomerSender = currentUser?.account_type === 'customer';
  const isValidPair =
    isCustomerSender &&
    (target.account_type === 'artisan' || target.account_type === 'customer');

  if (isValidPair) {
    // recipient always goes in artisan_id slot; sender in customer_id slot
    const artisanId = target.id;
    const customerId = user.id;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('artisan_id', artisanId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existing) redirect(`/messages/${existing.id}`);

    // Honor the recipient's "who can message me" setting before opening a new thread.
    if (!(await canStartConversation(supabase, customerId, artisanId))) {
      redirect(`/profile/${to}`);
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ artisan_id: artisanId, customer_id: customerId })
      .select('id')
      .single();

    if (error) {
      // Race condition — conversation may have just been created
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('artisan_id', artisanId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (retry) redirect(`/messages/${retry.id}`);
      redirect('/messages');
    }

    redirect(`/messages/${created!.id}`);
  }

  // Artisan-to-artisan or other invalid combinations
  redirect('/messages');
}
