'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronRight className="size-4" />
      رجوع
    </button>
  );
}
