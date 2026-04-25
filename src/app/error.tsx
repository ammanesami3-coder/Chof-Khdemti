'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-red-600" aria-hidden="true" />
      <h2 className="mb-2 text-2xl font-bold">حدث خطأ غير متوقع</h2>
      <p className="mb-6 text-muted-foreground">
        نعتذر، جرّب إعادة المحاولة أو تواصل معنا.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
