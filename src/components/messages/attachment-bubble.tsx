'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  Download, Eye,
  FileText, FileSpreadsheet, Presentation, File as FileIcon,
  Film,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

const ImageLightboxLazy = dynamic(
  () => import('@/components/shared/image-lightbox').then(m => m.ImageLightbox),
  { ssr: false },
);
import { getProxyDownloadUrl, getFileTypeLabel } from '@/lib/cloudinary-utils';
import { UploadOverlay } from './upload-overlay';
import type { AttachmentMetadata } from '@/lib/actions/messages';

const DocumentViewerModal = dynamic(
  () => import('./document-viewer-modal').then(m => m.DocumentViewerModal),
  { ssr: false },
);

type Props = {
  messageType:    'image' | 'video' | 'document' | 'audio';
  url:            string;
  metadata:       AttachmentMetadata;
  isSent:         boolean;
  caption?:       string | null;
  // Upload state
  uploadStatus?:  'uploading' | 'failed';
  uploadProgress?: number; // 0-100
  onCancelUpload?: () => void;
  onRetryUpload?:  () => void;
  previewUrl?:    string; // local blob URL for image preview during upload
};

function formatBytes(bytes: number) {
  if (bytes < 1024)    return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function DocIcon({ mime }: { mime?: string }) {
  if (!mime)                                                              return <FileIcon className="h-6 w-6 text-muted-foreground" />;
  if (mime.includes('pdf'))                                               return <FileText className="h-6 w-6 text-red-500" />;
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
                                                                          return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
  if (mime.includes('presentation') || mime.includes('powerpoint'))       return <Presentation className="h-6 w-6 text-[#FF9F43]" />;
  if (mime.includes('word') || mime.includes('msword'))                   return <FileText className="h-6 w-6 text-blue-500" />;
  return <FileText className="h-6 w-6 text-muted-foreground" />;
}

export function AttachmentBubble({
  messageType, url, metadata, isSent, caption,
  uploadStatus, uploadProgress, onCancelUpload, onRetryUpload, previewUrl,
}: Props) {
  const { t } = useLang();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewerOpen,   setViewerOpen]   = useState(false);

  const filename    = metadata.filename ?? (metadata.mime_type?.includes('pdf') ? 'document.pdf' : 'document');
  const downloadUrl = getProxyDownloadUrl(url, filename);
  const typeLabel   = getFileTypeLabel(metadata.mime_type, filename);
  const isUploading = uploadStatus === 'uploading';
  const isFailed    = uploadStatus === 'failed';

  // ── Image ──────────────────────────────────────────────────────────────────

  if (messageType === 'image') {
    const displaySrc = (isUploading || isFailed) && previewUrl ? previewUrl : (metadata.thumbnail_url ?? url);

    return (
      <div className="flex flex-col">
        {/* Image — no inner rounding; outer bubble wrapper handles it */}
        <div className="relative overflow-hidden">
          <button
            type="button"
            onClick={() => { if (!uploadStatus) setLightboxOpen(true); }}
            disabled={!!uploadStatus}
            className={cn('block w-full', !uploadStatus && 'cursor-pointer hover:opacity-90')}
            aria-label={t('viewImageAriaLabel')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt={metadata.filename ?? t('imageLabel')}
              className="max-h-72 w-full object-cover"
              loading="lazy"
            />
          </button>

          {uploadStatus && (
            <UploadOverlay
              status={uploadStatus}
              progress={isUploading ? uploadProgress : undefined}
              onCancel={onCancelUpload}
              onRetry={onRetryUpload}
            />
          )}
        </div>

        {caption && (
          <p className="px-3.5 pb-2.5 pt-1.5 text-sm leading-relaxed">
            {caption}
          </p>
        )}

        {!uploadStatus && (
          <ImageLightboxLazy
            src={url}
            alt={metadata.filename ?? t('imageLabel')}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            allowDownload
          />
        )}
      </div>
    );
  }

  // ── Video ──────────────────────────────────────────────────────────────────

  if (messageType === 'video') {
    return (
      <div className="flex flex-col">
        <div className="relative overflow-hidden">
          {isUploading || isFailed ? (
            <div className={cn(
              'flex h-48 w-full flex-col items-center justify-center gap-2',
              isSent ? 'bg-primary-foreground/10' : 'bg-black/10',
            )}>
              <Film className="h-8 w-8 opacity-40" />
              {metadata.filename && (
                <p className="max-w-[180px] truncate text-xs opacity-50">{metadata.filename}</p>
              )}
            </div>
          ) : (
            <video
              src={url}
              poster={metadata.thumbnail_url}
              controls
              preload="none"
              playsInline
              className="max-h-72 w-full object-cover"
            />
          )}

          {uploadStatus && (
            <UploadOverlay
              status={uploadStatus}
              progress={isUploading ? uploadProgress : undefined}
              onCancel={onCancelUpload}
              onRetry={onRetryUpload}
            />
          )}
        </div>

        {caption && (
          <p className="px-3.5 pb-2.5 pt-1.5 text-sm leading-relaxed">
            {caption}
          </p>
        )}
      </div>
    );
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  if (messageType === 'audio') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className={cn(
          'relative overflow-hidden rounded-xl',
        )}>
          <div className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5',
            isSent ? 'bg-primary-foreground/10' : 'bg-black/5',
          )}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg">
              🎵
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{metadata.filename ?? t('audioFileFallback')}</p>
              {metadata.size && (
                <p className="text-[10px] text-muted-foreground">{formatBytes(metadata.size)}</p>
              )}
            </div>
          </div>

          {/* Audio player only shown when not uploading */}
          {!uploadStatus && (
            <audio src={url} controls className="w-full" preload="none" />
          )}

          {uploadStatus && (
            <UploadOverlay
              status={uploadStatus}
              progress={isUploading ? uploadProgress : undefined}
              onCancel={onCancelUpload}
              onRetry={onRetryUpload}
            />
          )}
        </div>
        {caption && <p className="px-0.5 text-sm">{caption}</p>}
      </div>
    );
  }

  // ── Documents (PDF, DOCX, XLSX, PPTX …) ───────────────────────────────────

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn(
        'relative overflow-hidden rounded-xl border',
        isSent ? 'border-primary-foreground/20' : 'border-border',
      )}>
        {/* File info */}
        <div className={cn(
          'flex min-w-0 items-center gap-3 px-3 py-2.5',
          isSent ? 'bg-primary-foreground/10' : 'bg-black/5',
        )}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
            <DocIcon mime={metadata.mime_type} />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-xs font-semibold leading-tight max-w-[26ch] sm:max-w-[40ch]">{filename}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {metadata.size ? `${formatBytes(metadata.size)} · ` : ''}{typeLabel}
            </p>
          </div>
        </div>

        {/* Action buttons — hidden while uploading */}
        {!uploadStatus && (
          <>
            <div className={cn('h-px', isSent ? 'bg-primary-foreground/15' : 'bg-border')} />
            <div className={cn('flex', isSent ? 'bg-primary-foreground/5' : 'bg-background/60')}>
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                  isSent ? 'hover:bg-primary-foreground/10' : 'hover:bg-black/5',
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {t('previewLabel')}
              </button>
              <div className={cn('w-px self-stretch', isSent ? 'bg-primary-foreground/15' : 'bg-border')} />
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                  isSent ? 'hover:bg-primary-foreground/10' : 'hover:bg-black/5',
                )}
              >
                <Download className="h-3.5 w-3.5" />
                {t('downloadLabel')}
              </a>
            </div>
          </>
        )}

        {/* Upload overlay */}
        {uploadStatus && (
          <UploadOverlay
            status={uploadStatus}
            progress={isUploading ? uploadProgress : undefined}
            onCancel={onCancelUpload}
            onRetry={onRetryUpload}
          />
        )}
      </div>

      {caption && <p className="px-0.5 text-sm">{caption}</p>}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        {viewerOpen && (
          <DocumentViewerModal
            url={url}
            fileName={filename}
            mimeType={metadata.mime_type}
            fileSize={metadata.size}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </Dialog>
    </div>
  );
}
