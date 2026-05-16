'use client';

import { useLang } from '@/lib/i18n/language-context';
import type { TranslationKey } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';

export function PageTitle({ tKey, className }: { tKey: TranslationKey; className?: string }) {
  const { t } = useLang();
  return <h1 className={cn('text-xl font-bold', className)}>{t(tKey)}</h1>;
}
