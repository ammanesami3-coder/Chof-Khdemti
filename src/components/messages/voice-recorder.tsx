'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadVoiceToCloudinary } from '@/lib/cloudinary-upload';
import { sendVoiceMessage } from '@/lib/actions/messages';
import type { SentMessage } from '@/lib/actions/messages';

const MAX_SECONDS = 300; // 5 minutes

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
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const secondsRef  = useRef(0);

  // Keep secondsRef in sync with state for use inside callbacks
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  // Notify parent when recording state changes
  useEffect(() => {
    onRecordingChange(recording);
  }, [recording, onRecordingChange]);

  // Auto-stop at MAX_SECONDS
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) {
      stopAndSend();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

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
      setRecording(true);
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

    const duration = secondsRef.current;

    // Stop recorder and collect final chunks
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    // Stop mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Go idle immediately — no "uploading" UI shown
    const capturedChunks = [...chunksRef.current];
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);

    if (capturedChunks.length === 0) return;

    // Upload and send silently in background
    try {
      const mimeType = capturedChunks[0]?.type ?? 'audio/webm';
      const blob = new Blob(capturedChunks, { type: mimeType });

      const { url, duration: cloudDuration } = await uploadVoiceToCloudinary(blob, () => {});
      const finalDuration = cloudDuration > 0 ? cloudDuration : duration;
      const result = await sendVoiceMessage(conversationId, url, finalDuration);

      if (result.error || !result.data) {
        toast.error(
          result.error === 'subscription_required'
            ? 'يجب الاشتراك للرد'
            : 'فشل إرسال الرسالة الصوتية',
        );
      } else {
        onSent(result.data);
      }
    } catch {
      toast.error('فشل رفع الرسالة الصوتية');
    }
  }, [conversationId, onSent]);

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
    setRecording(false);
    setSeconds(0);
  }, []);

  /* ── Idle: mic button ──────────────────────────────────────── */
  if (!recording) {
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

      {/* Send */}
      <button
        type="button"
        onClick={stopAndSend}
        aria-label="إرسال الرسالة الصوتية"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
