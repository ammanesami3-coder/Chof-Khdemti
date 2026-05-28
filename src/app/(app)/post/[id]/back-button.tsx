'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/i18n/language-context';

export function BackButton() {
  const router = useRouter();
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronRight className="size-4" />
      {t('backLabel')}
    </button>
  );
}
