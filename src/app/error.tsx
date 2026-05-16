'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  const { t } = useLang();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-red-600" aria-hidden="true" />
      <h2 className="mb-2 text-2xl font-bold">{t('errorTitle')}</h2>
      <p className="mb-6 text-muted-foreground">
        {t('errorDesc')}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t('retry')}</Button>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
