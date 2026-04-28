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

    // iOS Safari requires an actual play() call during a user gesture to unlock
    // audio context. We play silently (volume=0) then immediately pause.
    function unlock() {
      [messageSoundRef.current, notificationSoundRef.current].forEach((audio) => {
        if (!audio) return;
        const saved = audio.volume;
        audio.volume = 0;
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = saved;
          })
          .catch(() => {
            audio.volume = saved;
          });
      });
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    }

    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('keydown', unlock, true);

    return () => {
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
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
