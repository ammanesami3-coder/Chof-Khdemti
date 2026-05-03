'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadVoiceToCloudinary } from '@/lib/cloudinary-upload';
import { sendVoiceMessage } from '@/lib/actions/messages';
import type { SentMessage } from '@/lib/actions/messages';

const MAX_SECONDS = 300; // 5 minutes

type RecordingState = 'idle' | 'recording' | 'uploading';

type Props = {
  conversationId: string;
  onRecordingChange: (active: boolean) => void;
  onSent: (msg: SentMessage) => void;
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
  onSent,
  disabled,
  className,
}: Props) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  // Notify parent whenever recording state changes
  useEffect(() => {
    onRecordingChange(state === 'recording');
  }, [state, onRecordingChange]);

  // Auto-stop at MAX_SECONDS
  useEffect(() => {
    if (state === 'recording' && seconds >= MAX_SECONDS) {
      stopAndSend();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, state]);

  // Cleanup on unmount
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
      setState('recording');
      setSeconds(0);

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('لا يمكن الوصول للميكروفون. تأكد من منح الإذن.');
    }
  }, [disabled]);

  const stopAndSend = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = seconds;

    // Stop recorder and collect final chunks
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    // Stop mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (chunksRef.current.length === 0) {
      setState('idle');
      setSeconds(0);
      return;
    }

    setState('uploading');
    setUploadProgress(0);

    try {
      const mimeType = chunksRef.current[0]?.type ?? 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });

      const { url, duration: cloudDuration } = await uploadVoiceToCloudinary(
        blob,
        setUploadProgress,
      );

      const finalDuration = cloudDuration > 0 ? cloudDuration : duration;

      const result = await sendVoiceMessage(conversationId, url, finalDuration);

      if (result.error || !result.data) {
        toast.error(result.error === 'subscription_required' ? 'يجب الاشتراك للرد' : 'فشل إرسال الرسالة الصوتية');
      } else {
        onSent(result.data);
      }
    } catch {
      toast.error('فشل رفع الرسالة الصوتية');
    } finally {
      setState('idle');
      setSeconds(0);
      setUploadProgress(0);
      chunksRef.current = [];
    }
  }, [conversationId, onSent, seconds]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setState('idle');
    setSeconds(0);
  }, []);

  /* ── Idle: just the mic button ─────────────────────────────── */
  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        aria-label="تسجيل رسالة صوتية"
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          'bg-muted text-muted-foreground transition-colors',
          'hover:bg-primary hover:text-primary-foreground',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          className,
        )}
      >
        <Mic className="h-5 w-5" />
      </button>
    );
  }

  /* ── Uploading ─────────────────────────────────────────────── */
  if (state === 'uploading') {
    return (
      <div
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-2xl',
          'bg-muted px-4 py-2 text-sm text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>جارٍ الرفع {uploadProgress > 0 ? `${uploadProgress}%` : ''}…</span>
      </div>
    );
  }

  /* ── Recording ─────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-3 rounded-2xl',
        'bg-muted px-3 py-2',
        className,
      )}
    >
      {/* Cancel */}
      <button
        type="button"
        onClick={cancel}
        aria-label="إلغاء التسجيل"
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
        <span className="tabular-nums text-sm font-medium text-red-500">
          {fmtTime(seconds)}
        </span>
        <span className="text-xs text-muted-foreground">
          / {fmtTime(MAX_SECONDS)}
        </span>
      </div>

      {/* Stop & Send */}
      <button
        type="button"
        onClick={stopAndSend}
        aria-label="إيقاف وإرسال"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
      >
        <Square className="h-4 w-4 fill-current" />
      </button>
    </div>
  );
}
