import Link from 'next/link';
import { Lock, Check } from 'lucide-react';
import { SUBSCRIPTION_PRICE_DISPLAY } from '@/lib/constants/subscription';
import type { SubscriptionStatus } from '@/types/subscription';

type Props = {
  status?: SubscriptionStatus;
};

type Config = {
  title: string;
  description: string;
  cta: string;
};

const STATUS_CONFIG: Partial<Record<SubscriptionStatus, Config>> = {
  trial_ended: {
    title: 'انتهت تجربتك المجانية',
    description: `اشترك بـ ${SUBSCRIPTION_PRICE_DISPLAY} لتستمر في الرد على رسائل زبائنك بدون حدود`,
    cta: 'اشترك الآن',
  },
  past_due: {
    title: 'فشل الدفع — حدّث طريقة الدفع',
    description: 'حدّث معلومات بطاقتك لاستعادة الوصول الكامل إلى المحادثات',
    cta: 'تحديث الدفع',
  },
  cancelled: {
    title: 'اشتراكك ملغى — جدّد للعودة',
    description: `جدّد اشتراكك بـ ${SUBSCRIPTION_PRICE_DISPLAY} للرد على رسائل زبائنك`,
    cta: 'جدّد الاشتراك',
  },
};

const BULLETS = ['محادثات بلا قيود', 'دعم فني مخصص', 'إلغاء في أي وقت'];

const FALLBACK: Config = STATUS_CONFIG.trial_ended!;

export function UpgradePrompt({ status = 'trial_ended' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? FALLBACK;

  return (
    <div className="border-t">
      <div className="mx-3 my-3 overflow-hidden rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-background to-green-50 shadow-sm dark:border-red-900/40 dark:from-red-950/20 dark:to-green-950/20">
        {/* Header stripe */}
        <div className="h-1 w-full bg-gradient-to-l from-red-600 to-green-600" />

        <div className="p-4">
          {/* Icon + title */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-green-600 shadow-sm">
              <Lock className="h-4.5 w-4.5 text-white" aria-hidden />
            </div>
            <h3 className="font-bold leading-snug text-foreground">{cfg.title}</h3>
          </div>

          {/* Description */}
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{cfg.description}</p>

          {/* Bullet points */}
          <ul className="mb-4 space-y-1.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            <Link
              href="/settings/subscription"
              className="flex items-center justify-center rounded-xl bg-gradient-to-l from-red-600 to-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {cfg.cta}
            </Link>
            <Link
              href="/settings/subscription"
              className="flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              اعرف المزيد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
