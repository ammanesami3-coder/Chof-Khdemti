'use client';

import { useRef, useCallback } from 'react';

type LongPressHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd:   (e: React.TouchEvent) => void;
  onTouchMove:  (e: React.TouchEvent) => void;
  onTouchCancel:(e: React.TouchEvent) => void;
};

export function useLongPress(
  callback: (e: React.TouchEvent) => void,
  ms = 450,
): LongPressHandlers {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const startX       = useRef(0);
  const startY       = useRef(0);

  const start = useCallback((e: React.TouchEvent) => {
    triggeredRef.current = false;
    startX.current = e.touches[0]?.clientX ?? 0;
    startY.current = e.touches[0]?.clientY ?? 0;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      callback(e);
      try { navigator?.vibrate?.(50); } catch { /* ignore */ }
    }, ms);
  }, [callback, ms]);

  const cancel = useCallback((e?: React.TouchEvent) => {
    if (e?.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      const dy = Math.abs(e.touches[0].clientY - startY.current);
      if (dx < 8 && dy < 8) return; // tiny move — keep timer alive
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelAlways = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart:  start,
    onTouchEnd:    cancelAlways,
    onTouchMove:   cancel,
    onTouchCancel: cancelAlways,
  };
}
