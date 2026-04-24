import type { Tables, Enums } from './database.types';

export type SubscriptionStatus = Enums<'subscription_status'>;

export type Subscription = Tables<'subscriptions'>;

export type SubscriptionWithDaysLeft = Subscription & {
  days_left: number | null;
  can_reply: boolean;
};
