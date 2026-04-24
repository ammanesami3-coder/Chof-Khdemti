'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMySubscription } from '@/lib/queries/subscription';
import type { SubscriptionStatus } from '@/types/subscription';

export type SubscriptionStatusResult = {
  isArtisan: boolean;
  status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  daysLeft: number | null;
  canReply: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
};

function selectSubscriptionStatus(
  data: Awaited<ReturnType<typeof fetchMySubscription>>,
): SubscriptionStatusResult {
  if (!data.isArtisan || !data.subscription) {
    return {
      isArtisan: data.isArtisan,
      status: null,
      trial_ends_at: null,
      daysLeft: null,
      canReply: true,
      cancelAtPeriodEnd: false,
      periodEnd: null,
    };
  }

  const { status, trial_ends_at, cancel_at_period_end, current_period_end } = data.subscription;
  const trialEndDate = trial_ends_at ? new Date(trial_ends_at) : null;
  const now = new Date();

  const daysLeft =
    status === 'trial' && trialEndDate !== null
      ? Math.ceil((trialEndDate.getTime() - now.getTime()) / 86_400_000)
      : null;

  const canReply =
    status === 'active' ||
    (status === 'trial' && trialEndDate !== null && trialEndDate > now);

  return {
    isArtisan: true,
    status,
    trial_ends_at,
    daysLeft,
    canReply,
    cancelAtPeriodEnd: cancel_at_period_end ?? false,
    periodEnd: current_period_end ?? null,
  };
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscription-status'],
    queryFn: fetchMySubscription,
    staleTime: 30_000,
    select: selectSubscriptionStatus,
  });
}
