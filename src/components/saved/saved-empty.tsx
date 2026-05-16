'use client';

import { Bookmark } from 'lucide-react';
import { useLang } from '@/lib/i18n/language-context';

export function SavedEmpty() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
      <Bookmark className="mb-4 size-12 text-muted-foreground/40" />
      <p className="text-base font-medium text-muted-foreground">{t('noSavedPosts')}</p>
      <p className="mt-1 text-sm text-muted-foreground/70">{t('savedPostsHint')}</p>
    </div>
  );
}
