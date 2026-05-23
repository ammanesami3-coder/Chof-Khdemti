import { requireUser } from '@/lib/supabase/require-user';
import { TRIAL_DURATION_DAYS } from '@/lib/constants/subscription';
import { SubscriptionPageClient } from './subscription-page-client';

export const metadata = { title: 'الاشتراك — Chof Khdemti' };

export default async function SubscriptionPage() {
  const { supabase, user } = await requireUser();

  const [userRes, subRes] = await Promise.all([
    supabase.from('users').select('account_type').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  const isCustomer = userRes.data?.account_type !== 'artisan';

  if (isCustomer) {
    return (
      <SubscriptionPageClient
        isCustomer
        status="trial"
        daysLeft={0}
        trialProgress={0}
        currentPeriodEnd={null}
        canManage={false}
        cancelAtPeriodEnd={false}
        lemonSubscriptionId={null}
      />
    );
  }

  const sub = subRes.data;
  const status = sub?.status ?? 'trial';

  const daysLeft =
    sub?.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000))
      : 0;

  const trialProgress = Math.min(
    100,
    Math.round(((TRIAL_DURATION_DAYS - daysLeft) / TRIAL_DURATION_DAYS) * 100),
  );

  return (
    <SubscriptionPageClient
      isCustomer={false}
      status={status}
      daysLeft={daysLeft}
      trialProgress={trialProgress}
      currentPeriodEnd={sub?.current_period_end ?? null}
      canManage={!!sub?.lemon_subscription_id}
      cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
      lemonSubscriptionId={sub?.lemon_subscription_id ?? null}
    />
  );
}
