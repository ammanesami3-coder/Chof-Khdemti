'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle, CreditCard, Flame, Gift } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { SUBSCRIPTION_PRICE_DISPLAY } from '@/lib/constants/subscription';

const BASE =
  'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors';

export function TrialIndicator() {
  const { data, isLoading } = useSubscriptionStatus();

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
          className={`${BASE} bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400`}
        >
          <AlertTriangle className="h-3 w-3" />
          {dateStr ? `يُلغى ${dateStr}` : 'يُلغى قريباً'}
        </Link>
      );
    }
    return (
      <span className={`${BASE} bg-green-100 text-green-700`}>
        <CheckCircle className="h-3 w-3" />
        اشتراك نشط
      </span>
    );
  }

  if (status === 'trial') {
    if (daysLeft !== null && daysLeft <= 1) {
      return (
        <Link href="/settings/subscription" className={`${BASE} bg-red-100 text-red-700 hover:bg-red-200`}>
          <Flame className="h-3 w-3" />
          ينتهي اليوم!
        </Link>
      );
    }
    if (daysLeft !== null && daysLeft <= 5) {
      return (
        <Link href="/settings/subscription" className={`${BASE} bg-yellow-100 text-yellow-700 hover:bg-yellow-200`}>
          <AlertTriangle className="h-3 w-3" />
          {daysLeft} يوم — اشترك الآن
        </Link>
      );
    }
    return (
      <span className={`${BASE} bg-green-100 text-green-700`}>
        <Gift className="h-3 w-3" />
        {daysLeft} يوم متبقي
      </span>
    );
  }

  if (status === 'trial_ended') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-red-600 text-white hover:bg-red-700`}>
        <CreditCard className="h-3 w-3" />
        اشترك الآن — {SUBSCRIPTION_PRICE_DISPLAY}
      </Link>
    );
  }

  if (status === 'past_due') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-red-100 text-red-700 hover:bg-red-200`}>
        <AlertTriangle className="h-3 w-3" />
        فشل الدفع — حدّث الدفع
      </Link>
    );
  }

  if (status === 'cancelled') {
    return (
      <Link href="/settings/subscription" className={`${BASE} bg-muted text-muted-foreground hover:bg-muted/80`}>
        <CreditCard className="h-3 w-3" />
        اشترك مجدداً
      </Link>
    );
  }

  return null;
}
