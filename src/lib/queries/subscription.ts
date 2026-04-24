import { createClient } from '@/lib/supabase/client';
import type { Subscription } from '@/types/subscription';

export type SubscriptionQueryResult = {
  isArtisan: boolean;
  subscription: Subscription | null;
};

export async function fetchMySubscription(): Promise<SubscriptionQueryResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isArtisan: false, subscription: null };

  const [userRes, subRes] = await Promise.all([
    supabase.from('users').select('account_type').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  return {
    isArtisan: userRes.data?.account_type === 'artisan',
    subscription: subRes.data,
  };
}
