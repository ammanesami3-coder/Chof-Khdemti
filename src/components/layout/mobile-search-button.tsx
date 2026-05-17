'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function MobileSearchButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="بحث"
      onClick={() => router.push('/search')}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}
