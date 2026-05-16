'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n/language-context';

export function MobileSearchButton() {
  const { t } = useLang();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t('search')}
      onClick={() => router.push('/search')}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}
