'use client';

/**
 * PresenceText — "Online now" / "Last seen …" line.
 *
 * Used in the chat header and on profiles.
 *
 * Privacy:
 *   - The OTHER user's privacy is enforced at the source: a hidden user is
 *     absent from Realtime Presence (no dot) and their last_seen_at is nulled
 *     out server-side before it ever reaches this component.
 *   - Reciprocity: a user who hides their OWN last seen cannot see anyone
 *     else's last seen either — checked here via useMyPrivacy().
 */

import { useIsOnline } from '@/hooks/use-is-online';
import { useMyPrivacy } from '@/hooks/use-my-privacy';
import { useLang } from '@/lib/i18n/language-context';
import { formatDistanceToNow } from 'date-fns';
import { ar, fr, enUS, type Locale } from 'date-fns/locale';
import type { Lang } from '@/lib/i18n/translations';

const LOCALE_MAP: Record<Lang, Locale> = { ar, fr, en: enUS };

type Props = {
  userId: string;
  lastSeenAt?: string | null;
  className?: string;
};

export function PresenceText({ userId, lastSeenAt, className }: Props) {
  const isOnline = useIsOnline(userId);
  const { lastSeenHidden } = useMyPrivacy();
  const { t, lang } = useLang();

  if (isOnline) {
    return (
      <span className={className}>
        <span className="me-1 inline-block size-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_5px_1px_rgba(34,197,94,0.6)]" />
        <span className="font-medium text-green-600 dark:text-green-400">
          {t('onlineNow')}
        </span>
      </span>
    );
  }

  // Reciprocity: hiding your own last seen also hides everyone else's from you.
  if (lastSeenHidden || !lastSeenAt) return null;

  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const text =
    diffMs < 60_000
      ? t('lastSeenJustNow')
      : `${t('lastSeenLabel')} ${formatDistanceToNow(new Date(lastSeenAt), {
          addSuffix: true,
          locale: LOCALE_MAP[lang],
        })}`;

  return (
    <span className={className}>
      <span className="text-muted-foreground">{text}</span>
    </span>
  );
}
