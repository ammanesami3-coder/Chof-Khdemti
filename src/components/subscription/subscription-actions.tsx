'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLang } from '@/lib/i18n/language-context';
import type { SubscriptionStatus } from '@/types/subscription';

type Props = {
  status: SubscriptionStatus;
  canManage: boolean;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function SubscriptionActions({ status, canManage, periodEnd, cancelAtPeriodEnd }: Props) {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const needsSubscribe = status !== 'active' && status !== 'past_due';
  const needsManage = status === 'active' || status === 'past_due';

  const SUBSCRIBE_LABEL: Partial<Record<SubscriptionStatus, string>> = {
    trial: t('subscribeTrial'),
    trial_ended: t('subscribe99'),
    cancelled: t('subscribeAgain'),
  };

  const dateLocale = lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US';

  function formatPeriodEnd(dateStr: string | null, fallback: string) {
    if (!dateStr) return fallback;
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/lemon/checkout', { method: 'POST' });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? t('checkoutError'));
        return;
      }
      window.location.href = json.url;
    } catch {
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch('/api/lemon/portal');
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? t('portalError'));
        return;
      }
      window.open(json.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelConfirm() {
    setLoading(true);
    try {
      const res = await fetch('/api/lemon/cancel', { method: 'POST' });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error ?? t('cancelSubError'));
        return;
      }
      const dateStr = formatPeriodEnd(periodEnd, t('periodEndFallback'));
      toast.success(`${t('cancelSuccessPrefix')} ${dateStr}`);
      setCancelOpen(false);
      window.location.reload();
    } catch {
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  }

  if (needsSubscribe) {
    return (
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-l from-red-600 to-green-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t('redirectingProgress') : (SUBSCRIBE_LABEL[status] ?? t('subscribeNowBtn'))}
      </button>
    );
  }

  if (needsManage) {
    if (status === 'past_due') {
      return (
        <button
          onClick={handleManage}
          disabled={loading || !canManage}
          className="w-full rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t('openingProgress') : t('updatePaymentBtn')}
        </button>
      );
    }

    return (
      <>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleManage}
            disabled={loading || !canManage}
            className="flex-1 rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('openingProgress') : t('manageSubscriptionBtn')}
          </button>

          {!cancelAtPeriodEnd && (
            <button
              onClick={() => setCancelOpen(true)}
              disabled={loading}
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-base font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('cancelSubscriptionBtn')}
            </button>
          )}
        </div>

        {cancelAtPeriodEnd && periodEnd && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t('cancelWillHappenAt')}{' '}
            {formatPeriodEnd(periodEnd, '')}
          </p>
        )}

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{t('confirmCancelTitle')}</DialogTitle>
              <DialogDescription>
                {periodEnd
                  ? t('confirmCancelDescWithDate').replace('{date}', formatPeriodEnd(periodEnd, ''))
                  : t('confirmCancelDescNoDate')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:flex-row-reverse">
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? t('cancellingProgress') : t('confirmCancelBtn')}
              </button>
              <button
                onClick={() => setCancelOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t('cancelBackBtn')}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
