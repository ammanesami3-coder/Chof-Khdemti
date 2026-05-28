'use client';

import { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Wrench,
  Mail,
  MessageSquare,
  Users,
  Zap,
  Star,
  Shield,
  X,
} from 'lucide-react';
import { BackButton } from '@/components/shared/back-button';
import { useLang } from '@/lib/i18n/language-context';

// ── FAQ data ──────────────────────────────────────────────────────────────────

type FaqItem = {
  q: string;
  a: string;
  tags: string[];
};

// ── FaqAccordion ──────────────────────────────────────────────────────────────

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/40"
      >
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary/70" />
        <p className="flex-1 text-sm font-medium leading-snug">{item.q}</p>
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const { t } = useLang();

  const FAQ_ITEMS: FaqItem[] = [
    { q: t('subFaqQ1'), a: t('subFaqA1'), tags: ['subscription', 'month', 'trial'] },
    { q: t('subFaqQ2'), a: t('subFaqA2'), tags: ['cancel', 'subscription'] },
    { q: t('subFaqQ3'), a: t('subFaqA3'), tags: ['payment', 'visa', 'mastercard'] },
    { q: t('subFaqQ4'), a: t('subFaqA4'), tags: ['invoice', 'receipt'] },
    { q: t('subFaqQ5'), a: t('subFaqA5'), tags: ['security', 'payment', 'pci'] },
  ];

  const HOW_IT_WORKS = [
    { icon: Users, title: t('howItWorksStep1Title'), desc: t('howItWorksStep1Desc'), color: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-600 dark:text-blue-400' },
    { icon: Wrench, title: t('howItWorksStep2Title'), desc: t('howItWorksStep2Desc'), color: 'bg-orange-50 dark:bg-orange-950/40', iconColor: 'text-orange-500 dark:text-orange-400' },
    { icon: Zap, title: t('howItWorksStep3Title'), desc: t('howItWorksStep3Desc'), color: 'bg-yellow-50 dark:bg-yellow-950/40', iconColor: 'text-yellow-600 dark:text-yellow-500' },
    { icon: MessageSquare, title: t('howItWorksStep4Title'), desc: t('howItWorksStep4Desc'), color: 'bg-green-50 dark:bg-green-950/40', iconColor: 'text-green-600 dark:text-green-400' },
    { icon: Star, title: t('howItWorksStep5Title'), desc: t('howItWorksStep5Desc'), color: 'bg-purple-50 dark:bg-purple-950/40', iconColor: 'text-purple-600 dark:text-purple-400' },
  ];

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.includes(q)),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, FAQ_ITEMS.length]);

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <h1 className="text-2xl font-bold">{t('helpCenterTitle')}</h1>
      </div>

      {/* Hero search */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border border-primary/20">
        <p className="mb-3 text-sm font-medium text-foreground/80">
          {t('helpHowCanWeHelp')}
        </p>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('helpSearchPlaceholder')}
            className="w-full rounded-xl border border-border/60 bg-background py-2.5 ps-9 pe-9 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* How it works — hidden when searching */}
      {!query && (
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('helpHowItWorksSection')}
          </h2>
          <div className="space-y-2">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${step.color}`}
                >
                  <step.icon className={`size-[18px] ${step.iconColor}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {query ? `${t('helpSearchResultsCount')} (${filteredFaq.length})` : t('helpFaqSection')}
        </h2>
        {filteredFaq.length > 0 ? (
          <div className="space-y-2">
            {filteredFaq.map((item, i) => (
              <FaqAccordion key={i} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card py-10 text-center shadow-sm">
            <Search className="size-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              {t('helpNoResultsFor')} &quot;{query}&quot;
            </p>
            <p className="text-xs text-muted-foreground/60">
              {t('helpTryDifferentSearch')}
            </p>
          </div>
        )}
      </section>

      {/* Contact Support */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('helpContactSection')}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/40">
          <a
            href="mailto:support@chofdkhdemti.ma"
            className="group flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-muted/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 transition-transform group-hover:scale-105">
              <Mail className="size-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('helpEmailLabel')}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                support@chofdkhdemti.ma
              </p>
            </div>
            <span className="text-xs font-medium text-primary">{t('helpSendLabel')}</span>
          </a>

          <a
            href="https://wa.me/212600000000"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-muted/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40 transition-transform group-hover:scale-105">
              <MessageSquare className="size-5 text-green-600 dark:text-green-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('helpWhatsAppLabel')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('helpWhatsAppHours')}
              </p>
            </div>
            <span className="text-xs font-medium text-green-600">{t('helpOpenLabel')}</span>
          </a>
        </div>
      </section>

      {/* Report an issue */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('helpReportSection')}
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40">
              <Shield className="size-5 text-red-500 dark:text-red-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('helpReportIssueTitle')}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t('helpReportIssueDesc')}
              </p>
            </div>
          </div>
          <a
            href="mailto:report@chofdkhdemti.ma?subject=بلاغ عن مشكلة"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <Shield className="size-4" />
            {t('helpReportBtn')}
          </a>
        </div>
      </section>

      {/* App version */}
      <div className="pb-4 text-center">
        <p className="text-xs text-muted-foreground/40">
          Chof Khdemti · {t('versionLabel')} 1.0
        </p>
      </div>
    </main>
  );
}
