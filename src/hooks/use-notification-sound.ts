'use client';

import { useRef, useEffect, useCallback } from 'react';

// Web Audio API gives near-zero-latency playback once the buffer is decoded.
// HTMLAudioElement.play() can add 50-300ms of latency from buffering.

type AudioBuffers = {
  message: AudioBuffer | null;
  notification: AudioBuffer | null;
};

async function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer | null, volume = 0.5) {
  if (!buffer) return;

  const doPlay = () => {
    try {
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(0);
    } catch {
      // Silently ignore if context is in a bad state
    }
  };

  // AudioContext starts suspended until a user gesture — resume then play.
  if (ctx.state === 'suspended') {
    ctx.resume().then(doPlay).catch(() => {});
  } else {
    doPlay();
  }
}

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<AudioBuffers>({ message: null, notification: null });
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Load both buffers immediately — they'll be ready before the first message
    void loadBuffer(ctx, '/sounds/message.mp3').then((b) => {
      buffersRef.current.message = b;
    });
    void loadBuffer(ctx, '/sounds/notification.mp3').then((b) => {
      buffersRef.current.notification = b;
    });

    // AudioContext starts suspended on most browsers until a user gesture.
    // Resume it on first interaction so subsequent sounds are instant.
    function unlock() {
      if (unlockedRef.current) return;
      ctx.resume().then(() => {
        unlockedRef.current = true;
      }).catch(() => {});
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
      ctx.close().catch(() => {});
    };
  }, []);

  const isEnabled = useCallback(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('soundEnabled') !== 'false',
    [],
  );

  const playMessage = useCallback(() => {
    if (!isEnabled() || !ctxRef.current) return;
    playBuffer(ctxRef.current, buffersRef.current.message);
  }, [isEnabled]);

  const playNotification = useCallback(() => {
    if (!isEnabled() || !ctxRef.current) return;
    playBuffer(ctxRef.current, buffersRef.current.notification);
  }, [isEnabled]);

  return { playMessage, playNotification };
}
