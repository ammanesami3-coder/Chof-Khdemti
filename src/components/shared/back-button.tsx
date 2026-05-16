'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/language-context';

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const { t } = useLang();
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleBack}
      aria-label={t('backAriaLabel')}
      className="shrink-0"
    >
      <ArrowRight className="size-5" />
    </Button>
  );
}
