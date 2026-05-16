'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const HEADER_BASE =
  'sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60';

export function NavbarWrapper({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      // Desktop (sm+): always visible — no autohide
      if (window.innerWidth >= 640) {
        if (hidden) setHidden(false);
        lastY.current = window.scrollY;
        return;
      }
      const y = window.scrollY;
      if (y > lastY.current && y > 80) {
        setHidden(true);
      } else if (y < lastY.current) {
        setHidden(false);
      }
      lastY.current = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hidden]);

  return (
    <header
      className={cn(
        HEADER_BASE,
        'transition-transform duration-300 ease-in-out',
        hidden && '-translate-y-full',
      )}
    >
      {children}
    </header>
  );
}
