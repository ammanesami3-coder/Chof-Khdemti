'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/language-context';

export function GuestNavButtons() {
  const { t } = useLang();
  return (
    <>
      <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        {t('login')}
      </Link>
      <Link href="/signup" className={buttonVariants({ size: 'sm' })}>
        {t('signup')}
      </Link>
    </>
  );
}
