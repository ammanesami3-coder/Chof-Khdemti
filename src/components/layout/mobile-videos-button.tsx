'use client';

import Link from 'next/link';
import { Video } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MobileVideosButton() {
  const pathname = usePathname();
  const isActive = pathname === '/videos' || pathname.startsWith('/videos/');

  return (
    <Link
      href="/videos"
      aria-label="الفيديوهات"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        isActive
          ? 'text-[#FF9F43]'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Video className="h-5 w-5" />
      {isActive && (
        <span
          className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
          style={{ background: 'var(--brand-gradient)' }}
        />
      )}
    </Link>
  );
}
