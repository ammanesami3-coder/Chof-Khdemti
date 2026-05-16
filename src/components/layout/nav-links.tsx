'use client';

import Link from 'next/link';
import { Home, Users } from 'lucide-react';
import { useLang } from '@/lib/i18n/language-context';

const LINK_CLASS =
  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

export function NavLinks() {
  const { t } = useLang();
  return (
    <>
      <Link href="/" className={LINK_CLASS}>
        <Home className="h-4 w-4" />
        {t('home')}
      </Link>
      <Link href="/explore" className={LINK_CLASS}>
        <Users className="h-4 w-4" />
        {t('explore')}
      </Link>
    </>
  );
}
