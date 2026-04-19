'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { CRAFTS } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';

export function ExploreFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const craft = searchParams.get('craft') ?? '';
  const city = searchParams.get('city') ?? '';
  const q = searchParams.get('q') ?? '';
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
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateParam('q', value), 300);
    },
    [updateParam]
  );

  function clearFilters() {
    router.push('?', { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث باسم الحرفي..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Craft filter */}
      <SelectNative
        value={craft}
        onChange={(e) => updateParam('craft', e.target.value)}
        className="sm:w-44"
      >
        <option value="">كل التخصصات</option>
        {CRAFTS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_ar}
          </option>
        ))}
      </SelectNative>

      {/* City filter */}
      <SelectNative
        value={city}
        onChange={(e) => updateParam('city', e.target.value)}
        className="sm:w-40"
      >
        <option value="">كل المدن</option>
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_ar}
          </option>
        ))}
      </SelectNative>

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 gap-1.5">
          <X className="size-4" />
          مسح
        </Button>
      )}
    </div>
  );
}
