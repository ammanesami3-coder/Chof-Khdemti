'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Flag, Trash2, Check, X, ExternalLink, Loader2, Inbox } from 'lucide-react';
import { BackButton } from '@/components/shared/back-button';
import { useLang } from '@/lib/i18n/language-context';
import { updateReportStatus, type ReportRow } from '@/lib/actions/reports';
import {
  moderatorDeletePost,
  moderatorDeleteComment,
  type ModerationCaps,
} from '@/lib/actions/moderation';

type Props = { initialReports: ReportRow[]; caps: ModerationCaps };

export function ReportsClient({ initialReports, caps }: Props) {
  const { t } = useLang();
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, start] = useTransition();

  function reasonLabel(reason: string | null): string {
    const map: Record<string, string> = {
      spam: t('reportSpam'),
      fraud: t('reportFraud'),
      inappropriate: t('reportInappropriate'),
      harassment: t('reportHarassment'),
      impersonation: t('reportImpersonation'),
      other: t('reportOther'),
    };
    return (reason && map[reason]) || t('reportOther');
  }

  function runAction(id: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    if (busyId) return;
    setBusyId(id);
    start(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.success) {
        toast.error(res.error ?? t('moderationActionFailed'));
        return;
      }
      toast.success(t('reportActionDone'));
      setReports((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  if (reports.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card py-16 text-center">
          <Inbox className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('reportsEmpty')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Header />

      <div className="space-y-3">
        {reports.map((r) => {
          const busy = busyId === r.id;
          const isPost = r.targetType === 'post';
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  <Flag className="size-3" />
                  {reasonLabel(r.reason)}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {isPost ? t('reportTargetPost') : t('reportTargetComment')}
                </span>
                <span className="ms-auto text-xs text-muted-foreground/70">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="mb-2 line-clamp-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5 text-sm">
                {r.preview || '—'}
              </p>

              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t('reportReporterLabel')}:{' '}
                  {r.reporterUsername ? (
                    <Link href={`/profile/${r.reporterUsername}`} className="font-medium hover:underline">
                      @{r.reporterUsername}
                    </Link>
                  ) : (
                    '—'
                  )}
                </span>
                {r.authorUsername && (
                  <Link href={`/profile/${r.authorUsername}`} className="font-medium hover:underline">
                    @{r.authorUsername}
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.postId && (
                  <Link
                    href={`/post/${r.postId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="size-3.5" />
                    {t('reportViewContent')}
                  </Link>
                )}

                {isPost && caps.canDeletePosts && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction(r.id, () => moderatorDeletePost(r.targetId))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    {t('reportRemovePost')}
                  </button>
                )}

                {!isPost && caps.canDeleteComments && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runAction(r.id, () => moderatorDeleteComment(r.targetId))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    {t('reportRemoveComment')}
                  </button>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(r.id, () => updateReportStatus(r.id, 'resolved'))}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <Check className="size-3.5" />
                  {t('reportResolve')}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runAction(r.id, () => updateReportStatus(r.id, 'dismissed'))}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <X className="size-3.5" />
                  {t('reportDismiss')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Header() {
  const { t } = useLang();
  return (
    <div className="mb-6 flex items-center gap-3">
      <BackButton fallback="/settings" />
      <div>
        <h1 className="text-2xl font-bold">{t('reportsInboxTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('reportsInboxSubtitle')}</p>
      </div>
    </div>
  );
}
