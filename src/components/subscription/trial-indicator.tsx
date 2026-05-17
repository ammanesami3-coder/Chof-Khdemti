'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle, CreditCard, Flame, Gift } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { SUBSCRIPTION_PRICE_DISPLAY } from '@/lib/constants/subscription';
import { useLang } from '@/lib/i18n/language-context';

const BASE =
  'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors';

export function TrialIndicator() {
  const { data, isLoading } = useSubscriptionStatus();
  const { t } = useLang();

  if (isLoading) {
    return <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />;
  }

  if (!data?.isArtisan) return null;

  const { status, daysLeft, cancelAtPeriodEnd, periodEnd } = data;

  if (status === 'active') {
    if (cancelAtPeriodEnd) {
      const dateStr = periodEnd
        ? new Date(periodEnd).toLocaleDateString('ar-MA', { month: 'short', day: 'numeric' })
        : null;
      return (
        <Link
          href="/settings/subscription"
          className={`${BASE} bg-[#FF9F43]/15 text-[#E88A38] hover:bg-[#FF9F43]/25 dark:bg-[#FF9F43]/20 dark:text-[#FFBA69]`}
        >
          <AlertTriangle className="h-3 w-3" />
          {dateStr
            ? `${t('cancellingAtDatePrefix')} ${dateStr}`
            : t('cancellingSoon')}
        </Link>
      );
    }
    return (
      <span className={`${BASE} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
        <CheckCircle className="h-3 w-3" />
        {t('activeSubscription')}
      </span>
    );
  }

  if (status === 'trial') {
    if (daysLeft !== null && daysLeft <= 1) {
      return (
        <Link href="/settings/subscription" className={`${BASE} bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50`}>
          <Flame className="h-3 w-3" />
          {t('trialExpiringToday')}
        </Link>
      );
    }
    if (daysLeft !== null && daysLeft <= 5) {
      return (
        <Link href="/settings/subscription" className={`${BASE} bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50`}>
          <AlertTriangle className="h-3 w-3" />
          {t('trialDaysUrgent').replace('{daysLeft}', String(daysLeft))}
        </Link>
      );
    }
    return (
      <span className={`${BASE} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
        <Gift className="h-3 w-3" />
        {t('trialDaysLeft').replace('{daysLeft}', String(daysLeft ?? ''))}
      </span>
    );
  }

  if (status === 'trial_ended') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-red-600 text-white hover:bg-red-700`}>
        <CreditCard className="h-3 w-3" />
        {t('subscribeNowWithPrice').replace('{price}', SUBSCRIPTION_PRICE_DISPLAY)}
      </Link>
    );
  }

  if (status === 'past_due') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50`}>
        <AlertTriangle className="h-3 w-3" />
        {t('pastDueIndicatorLabel')}
      </Link>
    );
  }

  if (status === 'cancelled') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-muted text-muted-foreground hover:bg-muted/80`}>
        <CreditCard className="h-3 w-3" />
        {t('resubscribeBtn')}
      </Link>
    );
  }

  return null;
}
