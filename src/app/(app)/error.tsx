'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[app]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
        <AlertTriangle className="size-8 text-red-600" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">حدث خطأ</h2>
        <p className="text-sm text-muted-foreground">
          تعذّر تحميل هذه الصفحة. تحقق من اتصالك ثم حاول مجدداً.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          إعادة المحاولة
        </Button>
        <Link href="/feed" className={buttonVariants({ variant: 'outline' })}>
          الفيد
        </Link>
      </div>
    </div>
  );
}
