import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">404</h1>
      <h2 className="mb-3 text-xl font-semibold">الصفحة غير موجودة</h2>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        يبدو أن هذه الصفحة لا وجود لها أو تمّ نقلها. تحقق من الرابط أو عد للرئيسية.
      </p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>
        الرجوع للرئيسية
      </Link>
    </div>
  );
}
