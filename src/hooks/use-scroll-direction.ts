'use client';

/**
 * useScrollDirection — true when chrome (FAB, navbar) should hide.
 *
 * Detects scroll on the WHOLE document, including inner scroll containers:
 * the home feed scrolls a <main> element, not the window, so a plain
 * `window.scroll` listener never fires there. We listen in the capture
 * phase so a single listener catches scroll from any element.
 *
 * Returns true while scrolling DOWN past `threshold`, false near the top
 * or while scrolling UP — so consumers can hide/show smoothly.
 */

import { useEffect, useState } from 'react';

export function useScrollDirection(threshold = 64): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = 0;
    let ticking = false;

    function scrollTopOf(target: EventTarget | null): number | null {
      if (target instanceof HTMLElement) return target.scrollTop;
      if (target === document || target instanceof Document) return window.scrollY;
      return null;
    }

    function onScroll(e: Event) {
      const y = scrollTopOf(e.target);
      if (y === null || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const delta = y - lastY;
        // ignore micro-scrolls / momentum jitter
        if (Math.abs(delta) > 6) {
          if (y < threshold) setHidden(false);       // near the top → always show
          else if (delta > 0) setHidden(true);       // scrolling down → hide
          else setHidden(false);                     // scrolling up → show
          lastY = y;
        }
        ticking = false;
      });
    }

    // capture: true → catches scroll bubbling-less events from inner containers
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () =>
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
  }, [threshold]);

  return hidden;
}
