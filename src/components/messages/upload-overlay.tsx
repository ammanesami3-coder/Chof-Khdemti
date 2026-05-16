'use client';

import { X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 125.66

type Props = {
  status: 'uploading' | 'failed';
  progress?: number; // 0-100; undefined = indeterminate spinner
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
};

export function UploadOverlay({ status, progress, onCancel, onRetry, className }: Props) {
  const { t } = useLang();

  if (status === 'failed') {
    return (
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2',
          'bg-black/55 rounded-[inherit]',
          'animate-in fade-in duration-200',
          className,
        )}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
          aria-label={t('retryAriaLabel')}
          className="group flex flex-col items-center gap-2"
        >
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            'bg-white/15 ring-2 ring-white/50',
            'transition-all duration-150 group-hover:bg-white/25 group-hover:scale-105 group-active:scale-95',
          )}>
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <span className="text-[11px] font-medium text-white/90">{t('uploadFailedRetry')}</span>
        </button>
      </div>
    );
  }

  const isDeterminate = typeof progress === 'number' && progress > 0;
  const dashOffset = isDeterminate
    ? CIRCUMFERENCE * (1 - progress! / 100)
    : CIRCUMFERENCE * 0.75;

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        'bg-black/45 rounded-[inherit]',
        'animate-in fade-in duration-200',
        className,
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
        aria-label={t('cancelUploadAriaLabel')}
        className="group relative flex h-[52px] w-[52px] items-center justify-center"
      >
        {/* SVG progress ring */}
        <svg
          className="-rotate-90 h-[52px] w-[52px] absolute inset-0"
          viewBox="0 0 48 48"
          fill="none"
        >
          {/* Background track */}
          <circle
            cx="24" cy="24" r={RADIUS}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2.5"
          />

          {/* Progress / spinner arc */}
          {isDeterminate ? (
            <circle
              cx="24" cy="24" r={RADIUS}
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-all duration-300 ease-out"
            />
          ) : (
            <circle
              cx="24" cy="24" r={RADIUS}
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.25} ${CIRCUMFERENCE * 0.75}`}
              style={{ animationDuration: '0.75s', animationTimingFunction: 'linear' }}
              className="origin-center animate-spin"
            />
          )}
        </svg>

        {/* X cancel icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <X className="h-[18px] w-[18px] text-white transition-transform duration-150 group-hover:scale-110 group-active:scale-95" />
        </div>
      </button>
    </div>
  );
}

/* ── Compact inline spinner for voice bubble ─────────────────────────── */

type VoiceSpinnerProps = {
  status: 'uploading' | 'failed';
  progress?: number;
  isSent: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
};

const R2 = 13;
const C2 = 2 * Math.PI * R2;

export function VoiceUploadButton({ status, progress, isSent, onCancel, onRetry }: VoiceSpinnerProps) {
  const { t } = useLang();
  const isDeterminate = typeof progress === 'number' && progress > 0;
  const dashOffset2 = isDeterminate ? C2 * (1 - progress! / 100) : C2 * 0.75;

  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
        aria-label={t('retryVoiceAriaLabel')}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          'transition-all duration-150 hover:scale-105 active:scale-95',
          isSent ? 'bg-white/20' : 'bg-destructive/15',
        )}
      >
        <RefreshCw className={cn('h-4 w-4', isSent ? 'text-white/80' : 'text-destructive')} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
      aria-label={t('cancelVoiceAriaLabel')}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <svg className="-rotate-90 h-9 w-9 absolute inset-0" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r={R2} stroke={isSent ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)'} strokeWidth="2" />
        {isDeterminate ? (
          <circle
            cx="15" cy="15" r={R2}
            stroke={isSent ? 'white' : 'hsl(var(--primary))'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C2}
            strokeDashoffset={dashOffset2}
            className="transition-all duration-300 ease-out"
          />
        ) : (
          <circle
            cx="15" cy="15" r={R2}
            stroke={isSent ? 'white' : 'hsl(var(--primary))'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${C2 * 0.25} ${C2 * 0.75}`}
            style={{ animationDuration: '0.75s', animationTimingFunction: 'linear' }}
            className="origin-center animate-spin"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <X className={cn(
          'h-3.5 w-3.5 transition-transform group-hover:scale-110',
          isSent ? 'text-white' : 'text-primary',
        )} />
      </div>
    </button>
  );
}
