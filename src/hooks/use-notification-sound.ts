'use client';

import { useRef, useEffect, useCallback } from 'react';

export function useNotificationSound() {
  const messageSoundRef = useRef<HTMLAudioElement | undefined>(undefined);
  const notificationSoundRef = useRef<HTMLAudioElement | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    messageSoundRef.current = new Audio('/sounds/message.mp3');
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    messageSoundRef.current.volume = 0.5;
    notificationSoundRef.current.volume = 0.5;

    // Unlock audio context on first user gesture (browser autoplay policy)
    function unlock() {
      messageSoundRef.current?.load();
      notificationSoundRef.current?.load();
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    }

    document.addEventListener('click', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('touchstart', unlock, true);

    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
  }, []);

  const isEnabled = useCallback(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('soundEnabled') !== 'false',
    [],
  );

  const playMessage = useCallback(() => {
    if (isEnabled()) messageSoundRef.current?.play().catch(() => {});
  }, [isEnabled]);

  const playNotification = useCallback(() => {
    if (isEnabled()) notificationSoundRef.current?.play().catch(() => {});
  }, [isEnabled]);

  return { playMessage, playNotification };
}
