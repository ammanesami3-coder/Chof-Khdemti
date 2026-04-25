export type SubscriptionStatus =
  | 'trial'
  | 'trial_ended'
  | 'active'
  | 'past_due'
  | 'cancelled';

/**
 * Pure function mirroring the DB can_artisan_reply() logic.
 * Accepts an optional `now` date to allow deterministic testing.
 */
export function canArtisanReplyLogic(
  status: SubscriptionStatus,
  trialEndsAt: string | null,
  now: Date = new Date(),
): boolean {
  if (status === 'active') return true;
  if (status === 'trial' && trialEndsAt && new Date(trialEndsAt) > now) return true;
  return false;
}
