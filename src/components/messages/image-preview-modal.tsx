'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Pencil } from 'lucide-react';
import { ImageEditor } from './image-editor';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  file:        File;
  open:        boolean;
  onClose:     () => void;
  /** blob is the (possibly edited) image; caption is the user's text */
  onSend:      (blob: Blob, caption: string) => void;
};

export function ImagePreviewModal({ file, open, onClose, onSend }: Props) {
  const { t, lang } = useLang();
  const [originalUrl,    setOriginalUrl]    = useState<string | null>(null);
  const [editedBlob,     setEditedBlob]     = useState<Blob | null>(null);
  const [editedUrl,      setEditedUrl]      = useState<string | null>(null);
  const [editorOpen,     setEditorOpen]     = useState(false);
  const [caption,        setCaption]        = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Create / revoke blob URL for the original file ─────────────────── */

  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setEditedBlob(null);
    setEditedUrl(null);
    setCaption('');
    setEditorOpen(false);
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  /* ── Handle editor save ──────────────────────────────────────────────── */

  const handleEditorSave = useCallback((blob: Blob) => {
    setEditedUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    const url = URL.createObjectURL(blob);
    setEditedBlob(blob);
    setEditedUrl(url);
    setEditorOpen(false);
  }, []);

  /* ── Revoke edited URL on unmount ────────────────────────────────────── */

  useEffect(() => {
    return () => { if (editedUrl) URL.revokeObjectURL(editedUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-resize caption textarea ───────────────────────────────────── */

  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleSend = useCallback(() => {
    onSend(editedBlob ?? file, caption.trim());
  }, [editedBlob, file, caption, onSend]);

  if (!open || typeof document === 'undefined') return null;

  const displayUrl = editedUrl ?? originalUrl;

  /* ── Editor takes over full screen ──────────────────────────────────── */

  if (editorOpen && originalUrl) {
    return createPortal(
      <ImageEditor
        src={originalUrl}
        onSave={handleEditorSave}
        onCancel={() => setEditorOpen(false)}
      />,
      document.body,
    );
  }

  /* ── Preview screen ──────────────────────────────────────────────────── */

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
          {t('previewLabel')}
          {editedBlob && (
            <span className="ms-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-xs text-white">
              {t('editedLabel')}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
          aria-label={t('editImageAriaLabel')}
        >
          <Pencil className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3">
        {displayUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={t('previewLabel')}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            draggable={false}
          />
        )}
      </div>

      {/* Caption + Send ──────────────────────────────────────────────── */}
      <div className="flex items-end gap-3 px-4 py-4 pb-safe">
        <div className="flex flex-1 items-end rounded-3xl bg-white/10 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/10">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={handleCaptionChange}
            placeholder={t('addCaptionPlaceholder')}
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
