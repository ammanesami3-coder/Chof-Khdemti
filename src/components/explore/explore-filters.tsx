'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { CRAFTS, getCraftName } from '@/lib/constants/crafts';
import { CITIES, getCityName } from '@/lib/constants/cities';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

// ── Active filter chip ────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#FF9F43]/40 bg-[#FF9F43]/10 py-0.5 ps-2.5 pe-1.5 text-xs font-medium text-[#E88A38] dark:text-[#FFBA69]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex size-4 items-center justify-center rounded-full hover:bg-[#FF9F43]/20 transition-colors"
        aria-label="إزالة الفلتر"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

// ── ExploreFilters ────────────────────────────────────────────────────────────

export function ExploreFilters() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const craft = searchParams.get('craft') ?? '';
  const city  = searchParams.get('city')  ?? '';
  const q     = searchParams.get('q')     ?? '';
  const sort  = searchParams.get('sort')  ?? '';

  const hasFilters = !!craft || !!city || !!q;

  // Controlled local state for the search input (debounces URL updates)
  const [searchValue, setSearchValue] = useState(q);

  // Sync input when URL param changes externally (e.g. "Clear filters")
  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateParam('q', value), 300);
    },
    [updateParam],
  );

  function clearFilters() {
    // Keep sort param when clearing filters
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    const qs = params.toString();
    router.push(qs ? `?${qs}` : '?', { scroll: false });
  }

  // Human-readable labels for chips
  const craftLabel = craft ? getCraftName(craft, lang) : null;
  const cityLabel  = city  ? getCityName(city, lang)   : null;

  return (
    <div className="space-y-3">
      {/* ── Filter controls ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={t('searchByArtisanPlaceholder')}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        <div className="flex gap-2">
          {/* Craft filter */}
          <SelectNative
            value={craft}
            onChange={(e) => updateParam('craft', e.target.value)}
            className={cn('flex-1 sm:flex-none sm:w-40', craft && 'border-[#FF9F43]/60 text-[#E88A38]')}
          >
            <option value="">{t('allCrafts')}</option>
            {CRAFTS.map((c) => (
              <option key={c.id} value={c.id}>
                {getCraftName(c.id, lang)}
              </option>
            ))}
          </SelectNative>

          {/* City filter */}
          <SelectNative
            value={city}
            onChange={(e) => updateParam('city', e.target.value)}
            className={cn('flex-1 sm:flex-none sm:w-36', city && 'border-[#FF9F43]/60 text-[#E88A38]')}
          >
            <option value="">{t('allCities')}</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {getCityName(c.id, lang)}
              </option>
            ))}
          </SelectNative>

          {/* Sort */}
          <SelectNative
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="flex-1 sm:flex-none sm:w-40"
            aria-label={t('sortLabel')}
          >
            <option value="">{t('sortDefault')}</option>
            <option value="rating">{t('sortRating')}</option>
            <option value="newest">{t('sortNewest')}</option>
            <option value="experience">{t('sortExperience')}</option>
          </SelectNative>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{t('activeFiltersLabel')}:</span>

          {craftLabel && (
            <FilterChip label={craftLabel} onRemove={() => updateParam('craft', '')} />
          )}
          {cityLabel && (
            <FilterChip label={cityLabel} onRemove={() => updateParam('city', '')} />
          )}
          {q && (
            <FilterChip
              label={`"${q}"`}
              onRemove={() => {
                updateParam('q', '');
                setSearchValue('');
              }}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t('clearFiltersLabel')}
          </Button>
        </div>
      )}
    </div>
  );
}
