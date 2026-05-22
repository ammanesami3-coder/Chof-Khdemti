'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/use-scroll-direction';

/**
 * NavbarWrapper — fixed top bar.
 *
 * On MOBILE it hides while scrolling down and slides back when scrolling up.
 * Uses `position: fixed` so hide/show never causes a layout shift (no shaking).
 * On DESKTOP (md+) the bar is always visible.
 */
export function NavbarWrapper({ children }: { children: ReactNode }) {
  const hidden = useScrollDirection(64);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'transition-transform duration-300 ease-out will-change-transform',
        hidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0',
      )}
    >
      {children}
    </header>
  );
}
