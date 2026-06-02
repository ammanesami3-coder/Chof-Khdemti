'use client';

import { ShieldAlert } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { useLang } from '@/lib/i18n/language-context';

/**
 * Static landing for banned users. The middleware redirects any authenticated
 * user whose profile has banned_at set here; RLS independently blocks all of
 * their writes. Reachable without tripping the onboarding/terms gates.
 */
export default function BannedPage() {
  const { t } = useLang();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-8" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">{t('bannedTitle')}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t('bannedDesc')}
      </p>
      <LogoutButton className="mt-8 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60">
        {t('bannedLogout')}
      </LogoutButton>
    </main>
  );
}
