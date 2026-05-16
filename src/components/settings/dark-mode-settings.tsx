'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLang } from '@/lib/i18n/language-context';

export function DarkModeSettings() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-36 rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-11 rounded-full bg-muted" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          {isDark ? (
            <Moon className="size-4 text-foreground" />
          ) : (
            <Sun className="size-4 text-amber-500" />
          )}
        </span>
        <div>
          <p className="font-medium leading-tight">{t('nightModeSetting')}</p>
          <p className="text-sm text-muted-foreground">
            {isDark ? t('darkModeActiveDesc') : t('lightModeActiveDesc')}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        dir="ltr"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isDark ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
