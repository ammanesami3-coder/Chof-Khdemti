'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Pencil } from 'lucide-react';
import { ImageEditor } from './image-editor';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  file:    File;
  open:    boolean;
  onClose: () => void;
  /** thumbnailBlob is the edited cover frame, if the user edited it */
  onSend:  (file: File, caption: string, thumbnailBlob?: Blob) => void;
};

export function VideoPreviewModal({ file, open, onClose, onSend }: Props) {
  const { t, lang } = useLang();
  const videoRef    = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [videoUrl,            setVideoUrl]            = useState<string | null>(null);
  const [caption,             setCaption]             = useState('');
  const [frameUrl,            setFrameUrl]            = useState<string | null>(null);
  const [editorOpen,          setEditorOpen]          = useState(false);
  const [customThumbnailBlob, setCustomThumbnailBlob] = useState<Blob | null>(null);
  const [customThumbnailUrl,  setCustomThumbnailUrl]  = useState<string | null>(null);

  /* ── Setup / teardown video blob URL ─────────────────────────────────── */

  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setCaption('');
    setEditorOpen(false);
    setFrameUrl(null);
    setCustomThumbnailBlob(null);
    setCustomThumbnailUrl(null);
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  /* ── Cleanup temp URLs on unmount ────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (frameUrl)           URL.revokeObjectURL(frameUrl);
      if (customThumbnailUrl) URL.revokeObjectURL(customThumbnailUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Capture current video frame → open editor ───────────────────────── */

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    video.pause();

    const canvas      = document.createElement('canvas');
    canvas.width      = video.videoWidth  || 640;
    canvas.height     = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setFrameUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      const url = URL.createObjectURL(blob);
      setFrameUrl(url);
      setEditorOpen(true);
    }, 'image/jpeg', 0.92);
  }, []);

  /* ── Editor callbacks ────────────────────────────────────────────────── */

  const handleEditorSave = useCallback((blob: Blob) => {
    setCustomThumbnailUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setFrameUrl((prev)           => { if (prev) URL.revokeObjectURL(prev); return null; });
    const url = URL.createObjectURL(blob);
    setCustomThumbnailBlob(blob);
    setCustomThumbnailUrl(url);
    setEditorOpen(false);
  }, []);

  const handleEditorCancel = useCallback(() => {
    setFrameUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setEditorOpen(false);
  }, []);

  const removeCustomThumbnail = useCallback(() => {
    setCustomThumbnailUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setCustomThumbnailBlob(null);
  }, []);

  /* ── Caption auto-resize ─────────────────────────────────────────────── */

  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  /* ── Send ────────────────────────────────────────────────────────────── */

  const handleSend = useCallback(() => {
    onSend(file, caption.trim(), customThumbnailBlob ?? undefined);
  }, [file, caption, customThumbnailBlob, onSend]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  if (!open || typeof document === 'undefined') return null;

  /* Editor full-screen takeover */
  if (editorOpen && frameUrl) {
    return createPortal(
      <ImageEditor
        src={frameUrl}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
          aria-label={t('closeLabel')}
        >
          <X className="h-5 w-5" />
        </button>

        <span className="flex-1 text-center text-sm font-medium text-white/70">
          {t('videoPreviewTitle')}
          {customThumbnailBlob && (
            <span className="ms-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">
              {t('coverEditedLabel')}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={captureFrame}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
          aria-label={t('editCoverAriaLabel')}
        >
          <Pencil className="h-5 w-5" />
        </button>
      </div>

      {/* Video player */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3">
        {videoUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            className="max-h-full max-w-full rounded-xl shadow-2xl"
          />
        )}
      </div>

      {/* Edited thumbnail preview strip */}
      {customThumbnailUrl && (
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-1">
          <span className="text-xs text-white/50">{t('customCoverLabel')}</span>
          <div className="relative h-10 w-[72px] overflow-hidden rounded-md ring-1 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customThumbnailUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={removeCustomThumbnail}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
            aria-label={t('cancelCoverEditAriaLabel')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Caption + Send */}
      <div className="flex items-end gap-3 px-4 py-4 pb-safe">
        <div className="flex flex-1 items-end rounded-3xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/10">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={handleCaptionChange}
            placeholder={t('addVideoCaptionPlaceholder')}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            rows={1}
            className="w-full resize-none bg-transparent text-sm text-white placeholder:text-white/40 outline-none leading-relaxed"
            style={{ maxHeight: 112 }}
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity active:scale-95"
          aria-label={t('sendAriaLabel')}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
