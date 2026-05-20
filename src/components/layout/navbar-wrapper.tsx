'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/use-scroll-direction';

/**
 * NavbarWrapper — sticky top bar.
 *
 * On MOBILE it hides while scrolling down (to free up screen space) and
 * slides back instantly when scrolling up. The negative margin-bottom
 * collapses the bar's slot so the content reclaims the space — no empty
 * gap. On DESKTOP (md+) the bar is always visible (md: overrides).
 */
export function NavbarWrapper({ children }: { children: ReactNode }) {
  const hidden = useScrollDirection(64);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-[transform,margin] duration-300 ease-out will-change-transform',
        hidden
          ? '-translate-y-full mb-[-3.5rem] md:translate-y-0 md:mb-0'
          : 'translate-y-0 mb-0',
      )}
    >
      {children}
    </header>
  );
}
