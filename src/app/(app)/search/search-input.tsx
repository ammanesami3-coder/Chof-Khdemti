'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useLang } from '@/lib/i18n/language-context';

type Props = { initialQuery?: string };

export function SearchPageInput({ initialQuery = '' }: Props) {
  const router = useRouter();
  const { t, dir } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mobile when landing on search page with no query
  useEffect(() => {
    if (!initialQuery && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialQuery]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value.trim();
      if (val) router.push(`/search?q=${encodeURIComponent(val)}`);
    }
  }

  return (
    <div className="relative flex items-center" dir={dir}>
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        defaultValue={initialQuery}
        onKeyDown={handleKeyDown}
        placeholder={t('searchPlaceholder')}
        autoComplete="off"
        aria-label={t('search')}
        className="h-11 w-full rounded-full border bg-muted/60 ps-11 pe-4 text-sm placeholder:text-muted-foreground outline-none ring-0 transition-all focus:bg-background focus:border-border focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
