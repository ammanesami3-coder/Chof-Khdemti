'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/language-context';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">404</h1>
      <h2 className="mb-3 text-xl font-semibold">{t('notFoundTitle')}</h2>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        {t('notFoundDesc')}
      </p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>
        {t('notFoundBack')}
      </Link>
    </div>
  );
}
