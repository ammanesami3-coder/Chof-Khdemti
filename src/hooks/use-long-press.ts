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
  ms = 400,
): LongPressHandlers {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = useCallback((e: React.TouchEvent) => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      callback(e);
    }, ms);
  }, [callback, ms]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart:  start,
    onTouchEnd:    cancel,
    onTouchMove:   cancel,
    onTouchCancel: cancel,
  };
}
