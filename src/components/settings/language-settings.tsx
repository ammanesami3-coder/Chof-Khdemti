'use client';

import { Check } from 'lucide-react';
import { useLang } from '@/lib/i18n/language-context';
import type { Lang } from '@/lib/i18n/translations';

type LangOption = {
  id: Lang;
  flag: string;
  nameKey: 'langAr' | 'langFr' | 'langEn';
  nativeKey: 'langNativeAr' | 'langNativeFr' | 'langNativeEn';
};

const LANGUAGES: LangOption[] = [
  { id: 'ar', flag: '🇲🇦', nameKey: 'langAr', nativeKey: 'langNativeAr' },
  { id: 'fr', flag: '🇫🇷', nameKey: 'langFr', nativeKey: 'langNativeFr' },
  { id: 'en', flag: '🇬🇧', nameKey: 'langEn', nativeKey: 'langNativeEn' },
];

export function LanguageSettings() {
  const { lang, setLang, t } = useLang();

  return (
    <div className="overflow-hidden rounded-xl border bg-card divide-y">
      {LANGUAGES.map((option) => {
        const isSelected = lang === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLang(option.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
              {option.flag}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{t(option.nameKey)}</p>
              <p className="text-xs text-muted-foreground">{t(option.nativeKey)}</p>
            </div>
            {isSelected && (
              <Check className="size-4 shrink-0 text-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
