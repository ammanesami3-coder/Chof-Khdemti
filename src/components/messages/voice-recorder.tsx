'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadVoiceToCloudinary } from '@/lib/cloudinary-upload';
import { sendVoiceMessage } from '@/lib/actions/messages';
import type { SentMessage } from '@/lib/actions/messages';
import { useLang } from '@/lib/i18n/language-context';

const MAX_SECONDS = 300; // 5 minutes

type Props = {
  conversationId: string;
  onRecordingChange: (active: boolean) => void;
  /** Called immediately when recording stops — adds optimistic message to chat. */
  onPendingVoice: (
    tempId: string,
    blobUrl: string,
    localDuration: number,
    cancelFn: () => void,
  ) => void;
  /** Called to update the upload progress bar (0-100). */
  onVoiceProgress: (tempId: string, progress: number) => void;
  /** Called when upload + server action succeed. */
  onVoiceSent: (tempId: string, msg: SentMessage) => void;
  /** Called on upload/send failure — retryFn re-runs the upload. */
  onVoiceFailed: (tempId: string, retryFn: () => void) => void;
  /** Called when user cancels the in-progress upload. */
  onVoiceCancelled: (tempId: string) => void;
  disabled?: boolean;
  className?: string;
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({
  conversationId,
  onRecordingChange,
  onPendingVoice,
  onVoiceProgress,
  onVoiceSent,
  onVoiceFailed,
  onVoiceCancelled,
  disabled,
  className,
}: Props) {
  const { t } = useLang();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds]     = useState(0);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const secondsRef   = useRef(0);

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { onRecordingChange(recording); }, [recording, onRecordingChange]);

  // Auto-stop at MAX_SECONDS
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stopAndSend();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(200);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error(t('micPermissionError'));
    }
  }, [t, disabled]);

  const stopAndSend = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const localDuration = secondsRef.current;

    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); recorder.stop(); });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const capturedChunks = [...chunksRef.current];
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);

    if (capturedChunks.length === 0) return;

    const mimeType = capturedChunks[0]?.type ?? 'audio/webm';
    const blob = new Blob(capturedChunks, { type: mimeType });
    const tempId = `temp-voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // The blobUrl is used as a local audio source for the optimistic bubble.
    // It is revoked once the upload completes or is cancelled.
    const blobUrl = URL.createObjectURL(blob);
    let blobRevoked = false;

    const revokeBlobOnce = () => {
      if (!blobRevoked) { URL.revokeObjectURL(blobUrl); blobRevoked = true; }
    };

    // currentAbortController is reassigned on each retry so cancelFn always
    // cancels the latest XHR — works because closures capture the binding.
    let currentAC = new AbortController();

    const doUpload = async () => {
      currentAC = new AbortController();
      onVoiceProgress(tempId, 0);

      try {
        const { url, duration: cloudDuration } = await uploadVoiceToCloudinary(
          blob,
          (p) => onVoiceProgress(tempId, p),
          currentAC.signal,
        );
        const finalDuration = cloudDuration > 0 ? cloudDuration : localDuration;
        const result = await sendVoiceMessage(conversationId, url, finalDuration);

        revokeBlobOnce();

        if (result.error || !result.data) {
          if (result.error === 'subscription_required') {
            toast.error(t('subscriptionRequiredToReply'));
            onVoiceCancelled(tempId); // remove the pending bubble
          } else {
            onVoiceFailed(tempId, doUpload);
            toast.error(t('voiceMessageFailed'));
          }
        } else {
          onVoiceSent(tempId, result.data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return; // cancelled — handled by cancelFn
        revokeBlobOnce();
        onVoiceFailed(tempId, doUpload);
        toast.error(t('voiceUploadFailed'));
      }
    };

    const cancelFn = () => {
      currentAC.abort();
      revokeBlobOnce();
      onVoiceCancelled(tempId);
    };

    // Add the optimistic message to chat immediately
    onPendingVoice(tempId, blobUrl, localDuration, cancelFn);

    // Run upload in background (fire and forget)
    doUpload();
  }, [t, conversationId, onPendingVoice, onVoiceProgress, onVoiceSent, onVoiceFailed, onVoiceCancelled]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
  }, []);

  /* ── Idle: mic button ──────────────────────────────────────────────────── */
  if (!recording) {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        aria-label={t('recordVoiceAriaLabel')}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          'bg-muted text-muted-foreground transition-colors',
          'hover:bg-[#FF9F43]/15 hover:text-[#FF9F43]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
      >
        <Mic className="h-5 w-5" />
      </button>
    );
  }

  /* ── Recording ─────────────────────────────────────────────────────────── */
  return (
    <div className={cn('flex flex-1 items-center gap-3 rounded-2xl bg-muted px-3 py-2', className)}>
      {/* Cancel recording (discards audio, no message added) */}
      <button
        type="button"
        onClick={cancel}
        aria-label={t('cancelRecordingAriaLabel')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Pulsing dot + timer */}
      <div className="flex flex-1 items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="tabular-nums text-sm font-medium text-red-500">{fmtTime(seconds)}</span>
        <span className="text-xs text-muted-foreground">/ {fmtTime(MAX_SECONDS)}</span>
      </div>

      {/* Send (stops recording, creates optimistic bubble, starts upload) */}
      <button
        type="button"
        onClick={stopAndSend}
        aria-label={t('sendVoiceAriaLabel')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
