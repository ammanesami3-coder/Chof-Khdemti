import { describe, it, expect } from 'vitest';
import {
  canArtisanReplyLogic,
  type SubscriptionStatus,
} from '@/lib/subscription/can-artisan-reply';

const FIXED_NOW = new Date('2025-06-01T12:00:00Z');
const FUTURE = '2025-07-01T12:00:00Z'; // after FIXED_NOW
const PAST = '2025-05-01T12:00:00Z';   // before FIXED_NOW

function check(status: SubscriptionStatus, trialEndsAt: string | null) {
  return canArtisanReplyLogic(status, trialEndsAt, FIXED_NOW);
}

describe('can_artisan_reply logic', () => {
  it('returns true for active subscription', () => {
    expect(check('active', null)).toBe(true);
  });

  it('returns true for active subscription even with past trial_ends_at', () => {
    expect(check('active', PAST)).toBe(true);
  });

  it('returns true for trial with future trial_ends_at', () => {
    expect(check('trial', FUTURE)).toBe(true);
  });

  it('returns false for trial with past trial_ends_at', () => {
    expect(check('trial', PAST)).toBe(false);
  });

  it('returns false for trial with null trial_ends_at', () => {
    expect(check('trial', null)).toBe(false);
  });

  it('returns false for trial_ended', () => {
    expect(check('trial_ended', PAST)).toBe(false);
  });

  it('returns false for trial_ended even with future trial_ends_at', () => {
    // Status is already trial_ended — the date no longer matters
    expect(check('trial_ended', FUTURE)).toBe(false);
  });

  it('returns false for past_due', () => {
    expect(check('past_due', null)).toBe(false);
  });

  it('returns false for cancelled', () => {
    expect(check('cancelled', null)).toBe(false);
  });
});
