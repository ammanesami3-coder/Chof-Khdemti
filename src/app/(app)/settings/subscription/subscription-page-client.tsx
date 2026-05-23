'use client';

import { Suspense } from 'react';
import { Gift, CheckCircle, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { BackButton } from '@/components/shared/back-button';
import { SubscriptionActions } from '@/components/subscription/subscription-actions';
import { SuccessToast } from '@/components/subscription/success-toast';
import { SUBSCRIPTION_PRICE_DISPLAY, TRIAL_DURATION_DAYS } from '@/lib/constants/subscription';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';
import type { SubscriptionStatus } from '@/types/subscription';

// ── Hero config ────────────────────────────────────────────────────────────
type HeroCfg = {
  gradient: string;
  border: string;
  iconBg: string;
  Icon: React.ElementType;
  iconColor: string;
  titleColor: string;
};

const HERO: Record<SubscriptionStatus, HeroCfg> = {
  trial: {
    gradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    Icon: Gift,
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
  },
  trial_ended: {
    gradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    Icon: Lock,
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-300',
  },
  active: {
    gradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    Icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
  },
  past_due: {
    gradient: 'from-[#FFF9E6] to-[#FFF3E0] dark:from-[#FF9F43]/10 dark:to-[#FF4D4D]/8',
    border: 'border-[#FFD073] dark:border-[#E88A38]',
    iconBg: 'bg-[#FF9F43]/15 dark:bg-[#FF9F43]/20',
    Icon: AlertTriangle,
    iconColor: 'text-[#E88A38] dark:text-[#FFBA69]',
    titleColor: 'text-[#D4631F] dark:text-[#FFD073]',
  },
  cancelled: {
    gradient: 'from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/20',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    Icon: XCircle,
    iconColor: 'text-slate-500 dark:text-slate-400',
    titleColor: 'text-slate-700 dark:text-slate-300',
  },
};

// ── Props ──────────────────────────────────────────────────────────────────
type Props = {
  isCustomer: boolean;
  status: SubscriptionStatus;
  daysLeft: number;
  trialProgress: number;
  currentPeriodEnd: string | null;   // raw ISO string — passed to SubscriptionActions
  canManage: boolean;
  cancelAtPeriodEnd: boolean;
  lemonSubscriptionId: string | null;
};

// ── Component ──────────────────────────────────────────────────────────────
export function SubscriptionPageClient({
  isCustomer,
  status,
  daysLeft,
  trialProgress,
  currentPeriodEnd,
  canManage,
  cancelAtPeriodEnd,
  lemonSubscriptionId,
}: Props) {
  const { t, lang } = useLang();

  if (isCustomer) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-lg font-medium">{t('subscriptionArtisansOnly')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('customersAlwaysFree')}</p>
      </main>
    );
  }

  // Format the period-end date using the user's locale
  const locale = lang === 'ar' ? 'ar-MA' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const formattedPeriodEnd = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const cfg = HERO[status];

  const heroTitle = (() => {
    if (status === 'trial') return t('trialHeroTitle').replace('{daysLeft}', String(daysLeft));
    if (status === 'trial_ended') return t('trialEndedHeroTitle');
    if (status === 'active') return t('activeSubscription');
    if (status === 'past_due') return t('pastDueTitle');
    return t('cancelledHeroTitle');
  })();

  const heroSubtitle = (() => {
    if (status === 'trial') return t('trialHeroSubtitle').replace('{days}', String(TRIAL_DURATION_DAYS));
    if (status === 'trial_ended') return t('trialEndedHeroSubtitle');
    if (status === 'active') return formattedPeriodEnd
      ? t('activeHeroSubtitleWithDate').replace('{date}', formattedPeriodEnd)
      : t('activeHeroSubtitleNoDate');
    if (status === 'past_due') return t('pastDueHeroSubtitle');
    return t('cancelledHeroSubtitle');
  })();

  const PLAN_FEATURES = [
    t('planFeatureUnlimitedChats'),
    t('planFeatureInstantReply'),
    t('planFeatureProfessionalProfile'),
    t('planFeatureSearchVisibility'),
    t('planFeatureSupport'),
  ];

  const FAQ = [
    { q: t('subFaqQ1'), a: t('subFaqA1') },
    { q: t('subFaqQ2'), a: t('subFaqA2') },
    { q: t('subFaqQ3'), a: t('subFaqA3') },
    { q: t('subFaqQ4'), a: t('subFaqA4') },
    { q: t('subFaqQ5'), a: t('subFaqA5') },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      {/* Success toast (useSearchParams requires Suspense) */}
      <Suspense>
        <SuccessToast />
      </Suspense>

      {/* Page header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <BackButton fallback="/settings" />
          <h1 className="text-2xl font-bold">{t('subscription')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {SUBSCRIPTION_PRICE_DISPLAY} — {t('subscriptionPageDesc')}
        </p>
      </div>

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm',
          cfg.gradient,
          cfg.border,
        )}
      >
        {/* Top stripe */}
        <div className="h-1 bg-gradient-to-l from-red-600 to-green-600" />

        <div className="p-6">
          {/* Icon + title */}
          <div className="mb-4 flex items-center gap-3">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', cfg.iconBg)}>
              <cfg.Icon className={cn('h-6 w-6', cfg.iconColor)} />
            </div>
            <div>
              <h2 className={cn('text-lg font-bold leading-snug', cfg.titleColor)}>
                {heroTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{heroSubtitle}</p>
            </div>
          </div>

          {/* Progress bar — trial only */}
          {status === 'trial' && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('trialDay1Label')}</span>
                <span>{t('trialDayNLabel').replace('{n}', String(TRIAL_DURATION_DAYS))}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-red-500 to-green-600 transition-all"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t('trialDaysUsedLabel')
                  .replace('{used}', String(TRIAL_DURATION_DAYS - daysLeft))
                  .replace('{total}', String(TRIAL_DURATION_DAYS))}
              </p>
            </div>
          )}

          {/* CTA button — SubscriptionActions needs the raw ISO string */}
          <SubscriptionActions
            status={status}
            canManage={canManage}
            periodEnd={currentPeriodEnd}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
          />
        </div>
      </div>

      {/* ── Plan details ───────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold">{t('planIncludesTitle')}</h3>
        <ul className="space-y-3">
          {PLAN_FEATURES.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <svg viewBox="0 0 12 12" className="h-3 w-3 stroke-current stroke-2 fill-none">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">{t('helpFaqSection')}</h3>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-xl border bg-card p-4">
              <p className="font-medium leading-snug">{q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
