'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';
import { VoiceUploadButton } from './upload-overlay';

const WAVEFORM_HEIGHTS = [3, 5, 7, 9, 6, 4, 8, 10, 7, 5, 9, 6, 4, 8, 10, 7, 5, 3, 7, 9, 6, 4, 8, 5, 9, 6, 4, 3];

type Props = {
  url: string;
  duration: number; // seconds
  isSent: boolean;
  uploadStatus?: 'uploading' | 'failed';
  uploadProgress?: number; // 0-100
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceMessageBubble({ url, duration, isSent, uploadStatus, uploadProgress, onCancelUpload, onRetryUpload }: Props) {
  const { t } = useLang();
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  }, [playing]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrent(t);
  };

  // ── Upload state (uploading / failed) ───────────────────────────────────────
  if (uploadStatus) {
    return (
      <div
        dir="ltr"
        className={cn('flex items-center gap-2.5', 'min-w-[180px] max-w-[260px]')}
      >
        {/* Spinner / retry button replaces play button */}
        <VoiceUploadButton
          status={uploadStatus}
          progress={uploadProgress}
          isSent={isSent}
          onCancel={onCancelUpload}
          onRetry={onRetryUpload}
        />

        {/* Static waveform bars */}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-px h-5 overflow-hidden">
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-full',
                  isSent ? 'bg-primary-foreground/25' : 'bg-primary/15',
                )}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>

        {/* Duration */}
        <span
          className={cn(
            'min-w-[32px] text-right text-[11px] tabular-nums opacity-60',
            isSent ? 'text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          {fmt(duration)}
        </span>
      </div>
    );
  }

  // ── Normal playback state ────────────────────────────────────────────────────
  return (
    // dir="ltr" so the progress bar always goes left→right regardless of RTL
    <div
      dir="ltr"
      className={cn(
        'flex items-center gap-2.5',
        'min-w-[180px] max-w-[260px]',
      )}
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration;
          if (d && isFinite(d)) setTotal(d);
        }}
      />

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80',
          isSent ? 'bg-white/20 dark:bg-white/15' : 'bg-primary/10',
        )}
        aria-label={playing ? t('pauseAriaLabel') : t('playAriaLabel')}
      >
        {playing
          ? <Pause className={cn('h-4 w-4', isSent ? 'text-white dark:text-primary-foreground' : 'text-primary')} />
          : <Play  className={cn('h-4 w-4 translate-x-0.5', isSent ? 'text-white dark:text-primary-foreground' : 'text-primary')} />
        }
      </button>

      {/* Progress track + animated bars */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Waveform bars (decorative, animate during playback) */}
        <div className="flex items-center gap-px h-5 overflow-hidden">
          {WAVEFORM_HEIGHTS.map((height, i) => {
            const filled = total > 0 && (i / 28) * total <= current;
            return (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-full transition-colors duration-100',
                  filled
                    ? (isSent ? 'bg-primary-foreground' : 'bg-primary')
                    : (isSent ? 'bg-primary-foreground/35' : 'bg-primary/25'),
                  playing && filled && 'animate-pulse',
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Seek slider (invisible but interactive) */}
        <input
          type="range"
          min={0}
          max={total || 1}
          step={0.1}
          value={current}
          onChange={handleSeek}
          className="absolute h-5 w-full cursor-pointer opacity-0"
          style={{ marginTop: '-20px' }}
          aria-label={t('seekAriaLabel')}
        />
      </div>

      {/* Time display */}
      <span
        className={cn(
          'min-w-[32px] text-right text-[11px] tabular-nums',
          isSent ? 'text-primary-foreground/75' : 'text-muted-foreground',
        )}
      >
        {playing ? fmt(current) : fmt(total)}
      </span>
    </div>
  );
}
