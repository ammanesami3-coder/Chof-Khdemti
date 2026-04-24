'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { SubscriptionStatus } from '@/types/subscription';

type Props = {
  status: SubscriptionStatus;
  canManage: boolean;
};

const SUBSCRIBE_LABEL: Partial<Record<SubscriptionStatus, string>> = {
  trial: 'اشترك الآن وتجنّب الانقطاع',
  trial_ended: 'اشترك بـ 99 درهم/شهر',
  cancelled: 'اشترك مجدداً',
};

export function SubscriptionActions({ status, canManage }: Props) {
  const [loading, setLoading] = useState(false);

  const needsSubscribe = status !== 'active' && status !== 'past_due';
  const needsManage = status === 'active' || status === 'past_due';

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/lemon/checkout', { method: 'POST' });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? 'خطأ في إنشاء رابط الدفع');
        return;
      }
      window.location.href = json.url;
    } catch {
      toast.error('خطأ في الاتصال. حاول مجدداً.');
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
        toast.error(json.error ?? 'خطأ في فتح بوابة الإدارة');
        return;
      }
      window.open(json.url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('خطأ في الاتصال. حاول مجدداً.');
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
        {loading ? 'جاري التحويل...' : (SUBSCRIBE_LABEL[status] ?? 'اشترك الآن')}
      </button>
    );
  }

  if (needsManage) {
    return (
      <button
        onClick={handleManage}
        disabled={loading || !canManage}
        className="w-full rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? 'جاري الفتح...'
          : status === 'past_due'
            ? 'حدّث طريقة الدفع'
            : 'إدارة الاشتراك'}
      </button>
    );
  }

  return null;
}
