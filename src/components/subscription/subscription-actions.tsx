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
import type { SubscriptionStatus } from '@/types/subscription';

type Props = {
  status: SubscriptionStatus;
  canManage: boolean;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const SUBSCRIBE_LABEL: Partial<Record<SubscriptionStatus, string>> = {
  trial: 'اشترك الآن وتجنّب الانقطاع',
  trial_ended: 'اشترك بـ 99 درهم/شهر',
  cancelled: 'اشترك مجدداً',
};

export function SubscriptionActions({ status, canManage, periodEnd, cancelAtPeriodEnd }: Props) {
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  async function handleCancelConfirm() {
    setLoading(true);
    try {
      const res = await fetch('/api/lemon/cancel', { method: 'POST' });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'خطأ في إلغاء الاشتراك');
        return;
      }
      const dateStr = periodEnd
        ? new Date(periodEnd).toLocaleDateString('ar-MA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'نهاية الفترة الحالية';
      toast.success(`سيتم إلغاء اشتراكك في ${dateStr}`);
      setCancelOpen(false);
      // Reload to reflect cancel_at_period_end change
      window.location.reload();
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
    // past_due: only portal button
    if (status === 'past_due') {
      return (
        <button
          onClick={handleManage}
          disabled={loading || !canManage}
          className="w-full rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'جاري الفتح...' : 'حدّث طريقة الدفع'}
        </button>
      );
    }

    // active: manage + cancel (if not already pending cancellation)
    return (
      <>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleManage}
            disabled={loading || !canManage}
            className="flex-1 rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'جاري الفتح...' : 'إدارة الاشتراك'}
          </button>

          {!cancelAtPeriodEnd && (
            <button
              onClick={() => setCancelOpen(true)}
              disabled={loading}
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-base font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء الاشتراك
            </button>
          )}
        </div>

        {cancelAtPeriodEnd && periodEnd && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            سيتم الإلغاء في{' '}
            {new Date(periodEnd).toLocaleDateString('ar-MA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تأكيد إلغاء الاشتراك</DialogTitle>
              <DialogDescription>
                {periodEnd
                  ? `ستستمر في الاستفادة من كامل الخدمة حتى ${new Date(periodEnd).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })}، وبعدها لن تستطيع الرد على رسائل الزبائن.`
                  : 'ستستمر في الاستفادة من كامل الخدمة حتى نهاية الفترة الحالية، وبعدها لن تستطيع الرد على رسائل الزبائن.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:flex-row-reverse">
              <button
                onClick={handleCancelConfirm}
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
              <button
                onClick={() => setCancelOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                تراجع
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}
