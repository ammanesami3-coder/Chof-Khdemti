'use client';

/**
 * useScrollDirection — true when chrome (FAB, navbar) should hide.
 *
 * Tracks each scroll container independently so inner scroll areas (e.g. a
 * <main> with overflow-y: auto) don't corrupt the lastY used for the window,
 * which was the root cause of the "shaking" effect.
 */

import { useEffect, useState } from 'react';

export function useScrollDirection(threshold = 64): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Per-target last scroll position so cross-container delta is never computed.
    const lastY = new WeakMap<EventTarget, number>();
    let ticking = false;

    function scrollTopOf(target: EventTarget): number | null {
      if (target instanceof HTMLElement) return target.scrollTop;
      if (target === document || target instanceof Document) return window.scrollY;
      return null;
    }

    function onScroll(e: Event) {
      const target = e.target;
      if (!target) return;
      const y = scrollTopOf(target);
      if (y === null || ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const prev = lastY.get(target) ?? 0;
        const delta = y - prev;

        // Always update so the next delta is relative to the latest position.
        lastY.set(target, y);

        // Ignore micro-scrolls / momentum jitter
        if (Math.abs(delta) > 6) {
          if (y < threshold) setHidden(false);  // near top → always show
          else if (delta > 0) setHidden(true);  // scrolling down → hide
          else setHidden(false);                // scrolling up → show
        }
        ticking = false;
      });
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () =>
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
  }, [threshold]);

  return hidden;
}
