import { toast } from 'sonner';

/**
 * Shows a standardised toast when an artisan tries to use a feature that
 * requires an active subscription.  Includes a direct CTA to the
 * subscription settings page.
 */
export function showSubscriptionRequiredToast() {
  toast.error('هذه الميزة متاحة للحرفيين المشتركين فقط', {
    description: 'اشترك الآن للوصول إلى جميع ميزات التفاعل',
    action: {
      label: 'اشترك الآن',
      onClick: () => {
        window.location.href = '/settings/subscription';
      },
    },
    duration: 6000,
  });
}

/** Returns true if an error thrown by a Server Action signals subscription required. */
export function isSubscriptionRequiredError(err: unknown): boolean {
  return err instanceof Error && err.message === 'subscription_required';
}
