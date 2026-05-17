'use client';

import { useRef, useState, useCallback } from 'react';
import { Plus, Image, Video, FileText, Music, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadAttachmentToCloudinary } from '@/lib/cloudinary-upload';
import { sendAttachmentMessage, sendLocationMessage } from '@/lib/actions/messages';
import type { SentMessage, AttachmentMetadata } from '@/lib/actions/messages';
import { useLang } from '@/lib/i18n/language-context';
import { LocationPicker } from './location-picker';
import { ImagePreviewModal } from './image-preview-modal';
import { VideoPreviewModal } from './video-preview-modal';

export type AttachmentType = 'image' | 'video' | 'document' | 'audio';

export type AttachmentPreviewInfo = {
  previewUrl?: string; // local blob URL (images only)
  filename:    string;
  size:        number;
  mimeType:    string;
};

type OptionDef = {
  type:   AttachmentType;
  labelKey: 'attachTypeImage' | 'attachTypeVideo' | 'attachTypeDocument' | 'attachTypeAudio';
  icon:   React.FC<{ className?: string }>;
  accept: string;
  color:  string;
};

const OPTIONS: OptionDef[] = [
  { type: 'image',    labelKey: 'attachTypeImage',    icon: Image,    accept: 'image/*',                                          color: 'text-blue-500'   },
  { type: 'video',    labelKey: 'attachTypeVideo',    icon: Video,    accept: 'video/*',                                          color: 'text-purple-500' },
  { type: 'document', labelKey: 'attachTypeDocument', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv', color: 'text-orange-500' },
  { type: 'audio',    labelKey: 'attachTypeAudio',    icon: Music,    accept: 'audio/*',                                          color: 'text-green-500'  },
];

type Props = {
  conversationId:    string;
  replyToMessageId?: string | null;
  /** Called immediately after file is selected — adds optimistic message to chat. */
  onPendingAttachment: (
    tempId:   string,
    type:     AttachmentType,
    info:     AttachmentPreviewInfo,
    cancelFn: () => void,
  ) => void;
  /** Called to update upload progress bar (0-100). */
  onAttachmentProgress:  (tempId: string, progress: number) => void;
  /** Called when upload + server action succeed. */
  onAttachmentSent:      (tempId: string, msg: SentMessage) => void;
  /** Called on failure — retryFn re-runs the upload. */
  onAttachmentFailed:    (tempId: string, retryFn: () => void) => void;
  /** Called when user cancels the in-progress upload. */
  onAttachmentCancelled: (tempId: string) => void;
  /** Called for location messages (no upload involved). */
  onLocationSent:        (msg: SentMessage) => void;
  disabled?: boolean;
};

export function AttachmentPicker({
  conversationId,
  replyToMessageId,
  onPendingAttachment,
  onAttachmentProgress,
  onAttachmentSent,
  onAttachmentFailed,
  onAttachmentCancelled,
  onLocationSent,
  disabled,
}: Props) {
  const { t, dir } = useLang();
  const [open,             setOpen]             = useState(false);
  const [locationOpen,     setLocationOpen]     = useState(false);
  const [imagePreviewFile, setImagePreviewFile] = useState<File | null>(null);
  const [videoPreviewFile, setVideoPreviewFile] = useState<File | null>(null);

  const fileInputRefs = useRef<Record<AttachmentType, HTMLInputElement | null>>({
    image: null, video: null, document: null, audio: null,
  });

  /* ── Core upload logic (shared by all types + image after preview) ─── */

  const startUpload = useCallback((
    blob:     Blob,
    type:     AttachmentType,
    fileInfo: { name: string; mimeType: string },
    caption?: string,
    /** Optional pre-created preview URL (caller owns revocation) */
    externalPreviewUrl?: string,
    /** Optional edited thumbnail blob (video only) — uploaded before the main file */
    thumbnailBlob?: Blob,
  ) => {
    const tempId = `temp-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // We only create + own a local preview for non-image types or when not provided
    const ownPreview = (type === 'image') && !externalPreviewUrl;
    const previewUrl = externalPreviewUrl ?? (ownPreview ? URL.createObjectURL(blob) : undefined);
    let previewRevoked = false;

    const revokePreviewOnce = () => {
      if (!previewRevoked && previewUrl && ownPreview) {
        URL.revokeObjectURL(previewUrl);
        previewRevoked = true;
      }
    };

    // Wrap Blob as File if needed (Cloudinary SDK expects File)
    const uploadFile = blob instanceof File
      ? blob
      : new File([blob], fileInfo.name, { type: fileInfo.mimeType || 'application/octet-stream' });

    // AbortController is reassigned on each retry; closures capture the binding.
    let currentAC = new AbortController();

    const doUpload = async () => {
      currentAC = new AbortController();
      onAttachmentProgress(tempId, 0);

      try {
        // Upload edited thumbnail first (video with custom cover frame)
        let customThumbUrl: string | undefined;
        if (thumbnailBlob && type === 'video') {
          try {
            const thumbFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
            const thumbResult = await uploadAttachmentToCloudinary(thumbFile, 'image', undefined, currentAC.signal);
            customThumbUrl = thumbResult.url;
          } catch (thumbErr) {
            if (thumbErr instanceof DOMException && (thumbErr as DOMException).name === 'AbortError') return;
            // Fall through — Cloudinary auto-generated thumbnail will be used
          }
        }

        const result = await uploadAttachmentToCloudinary(
          uploadFile, type,
          (p) => onAttachmentProgress(tempId, p),
          currentAC.signal,
        );

        const metadata: AttachmentMetadata = {
          filename:      result.filename,
          size:          result.size,
          mime_type:     result.mime_type || fileInfo.mimeType || undefined,
          width:         result.width,
          height:        result.height,
          duration:      result.duration,
          thumbnail_url: customThumbUrl ?? result.thumbnail_url,
        };

        const res = await sendAttachmentMessage(
          conversationId, result.url, type, metadata,
          caption ?? null,
          replyToMessageId ?? null,
        );

        revokePreviewOnce();

        if ('error' in res) {
          if (res.error === 'subscription_required') {
            toast.error(t('subscriptionRequiredForAttachments'));
            onAttachmentCancelled(tempId);
          } else {
            onAttachmentFailed(tempId, doUpload);
            toast.error(res.error || t('fileSendFailed'));
          }
        } else {
          onAttachmentSent(tempId, res.data);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        revokePreviewOnce();
        toast.error(err instanceof Error ? err.message : t('fileUploadFailed'));
        onAttachmentFailed(tempId, doUpload);
      }
    };

    const cancelFn = () => {
      currentAC.abort();
      revokePreviewOnce();
      onAttachmentCancelled(tempId);
    };

    onPendingAttachment(tempId, type, {
      previewUrl,
      filename: fileInfo.name,
      size:     blob.size,
      mimeType: fileInfo.mimeType,
    }, cancelFn);

    doUpload(); // fire and forget
  }, [
    t, conversationId, replyToMessageId,
    onPendingAttachment, onAttachmentProgress,
    onAttachmentSent, onAttachmentFailed, onAttachmentCancelled,
  ]);

  /* ── File input handler ──────────────────────────────────────────────── */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: AttachmentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file after failure

    if (type === 'image') {
      setImagePreviewFile(file);
      return;
    }

    if (type === 'video') {
      setVideoPreviewFile(file);
      return;
    }

    startUpload(file, type, { name: file.name, mimeType: file.type });
  };

  /* ── Location ────────────────────────────────────────────────────────── */

  const handleLocationConfirm = async (loc: { lat: number; lng: number; name: string }) => {
    try {
      const res = await sendLocationMessage(conversationId, loc.lat, loc.lng, loc.name);
      if ('error' in res) {
        toast.error(res.error === 'subscription_required' ? t('subscriptionRequiredForLocation') : res.error);
      } else {
        onLocationSent(res.data);
      }
    } catch {
      toast.error(t('locationSendFailed'));
    }
  };

  /* ── Image preview send ──────────────────────────────────────────────── */

  const handleVideoPreviewSend = useCallback((file: File, caption: string, thumbnailBlob?: Blob) => {
    setVideoPreviewFile(null);
    startUpload(file, 'video', {
      name:     file.name,
      mimeType: file.type,
    }, caption || undefined, undefined, thumbnailBlob);
  }, [startUpload]);

  const handleImagePreviewSend = useCallback((blob: Blob, caption: string) => {
    const origFile = imagePreviewFile;
    setImagePreviewFile(null);
    if (!origFile) return;

    // The preview modal already created an editedUrl; we create a fresh one for the
    // optimistic bubble (startUpload will own it if ownPreview is true).
    startUpload(blob, 'image', {
      name:     origFile.name.replace(/\.\w+$/, '') + '.jpg',
      mimeType: blob.type || 'image/jpeg',
    }, caption || undefined);
  }, [imagePreviewFile, startUpload]);

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="relative shrink-0">
      {/* Hidden file inputs */}
      {OPTIONS.map(({ type, accept }) => (
        <input
          key={type}
          ref={(el) => { fileInputRefs.current[type] = el; }}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileChange(e, type)}
        />
      ))}

      {/* + button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border bg-muted/60',
          'transition-colors hover:bg-accent hover:text-foreground',
          'disabled:cursor-not-allowed disabled:opacity-40',
          open && 'bg-accent text-foreground',
        )}
        aria-label={t('attachFileAriaLabel')}
      >
        {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      {/* Options panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            dir={dir}
            className={cn(
            'absolute bottom-full mb-2 z-40 right-0',
            'flex flex-col gap-1 rounded-2xl border bg-background p-2 shadow-lg',
            'animate-in slide-in-from-bottom-2 duration-150',
          )}>
            {OPTIONS.map(({ type, labelKey, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => { fileInputRefs.current[type]?.click(); setOpen(false); }}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Icon className={cn('h-5 w-5 shrink-0', color)} />
                <span>{t(labelKey)}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setOpen(false); setLocationOpen(true); }}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <MapPin className="h-5 w-5 shrink-0 text-rose-500" />
              <span>{t('attachTypeLocation')}</span>
            </button>
          </div>
        </>
      )}

      <LocationPicker
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onConfirm={handleLocationConfirm}
      />

      {imagePreviewFile && (
        <ImagePreviewModal
          file={imagePreviewFile}
          open
          onClose={() => setImagePreviewFile(null)}
          onSend={handleImagePreviewSend}
        />
      )}

      {videoPreviewFile && (
        <VideoPreviewModal
          file={videoPreviewFile}
          open
          onClose={() => setVideoPreviewFile(null)}
          onSend={handleVideoPreviewSend}
        />
      )}
    </div>
  );
}
