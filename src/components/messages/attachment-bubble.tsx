'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  Download, Eye,
  FileText, FileSpreadsheet, Presentation, File as FileIcon,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getProxyDownloadUrl, getFileTypeLabel } from '@/lib/cloudinary-utils';
import type { AttachmentMetadata } from '@/lib/actions/messages';

// Lazy-load the heavy viewer modal (blob fetch + iframe)
const DocumentViewerModal = dynamic(
  () => import('./document-viewer-modal').then(m => m.DocumentViewerModal),
  { ssr: false },
);

type Props = {
  messageType: 'image' | 'video' | 'document' | 'audio';
  url:         string;
  metadata:    AttachmentMetadata;
  isSent:      boolean;
  caption?:    string | null;
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
  if (mime.includes('presentation') || mime.includes('powerpoint'))       return <Presentation className="h-6 w-6 text-orange-500" />;
  if (mime.includes('word') || mime.includes('msword'))                   return <FileText className="h-6 w-6 text-blue-500" />;
  return <FileText className="h-6 w-6 text-muted-foreground" />;
}

export function AttachmentBubble({ messageType, url, metadata, isSent, caption }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [viewerOpen,   setViewerOpen]   = useState(false);

  const filename    = metadata.filename ?? (metadata.mime_type?.includes('pdf') ? 'document.pdf' : 'document');
  const downloadUrl = getProxyDownloadUrl(url, filename);
  const typeLabel   = getFileTypeLabel(metadata.mime_type, filename);

  // ── Image ──────────────────────────────────────────────────────────────────

  if (messageType === 'image') {
    const thumb = metadata.thumbnail_url ?? url;
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block overflow-hidden rounded-xl"
          aria-label="عرض الصورة"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={metadata.filename ?? 'صورة'}
            className="max-h-72 w-full object-cover transition-opacity hover:opacity-90"
            loading="lazy"
          />
        </button>
        {caption && <p className="px-0.5 text-sm">{caption}</p>}

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl border-0 bg-black/90 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={metadata.filename ?? 'صورة'}
              className="max-h-[90vh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Video ──────────────────────────────────────────────────────────────────

  if (messageType === 'video') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="overflow-hidden rounded-xl">
          <video
            src={url}
            poster={metadata.thumbnail_url}
            controls
            preload="none"
            playsInline
            className="max-h-72 w-full rounded-xl object-cover"
          />
        </div>
        {caption && <p className="px-0.5 text-sm">{caption}</p>}
      </div>
    );
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  if (messageType === 'audio') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5',
          isSent ? 'bg-primary-foreground/10' : 'bg-black/5',
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg">
            🎵
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{metadata.filename ?? 'ملف صوتي'}</p>
            {metadata.size && (
              <p className="text-[10px] text-muted-foreground">{formatBytes(metadata.size)}</p>
            )}
          </div>
        </div>
        <audio src={url} controls className="w-full" preload="none" />
        {caption && <p className="px-0.5 text-sm">{caption}</p>}
      </div>
    );
  }

  // ── Documents (PDF, DOCX, XLSX, PPTX …) ───────────────────────────────────
  //
  // WhatsApp-style card:
  //  ┌──────────────────────────────────┐
  //  │ [icon]  filename.pdf             │
  //  │         30.9 KB · PDF            │
  //  ├──────────────────────────────────┤
  //  │   [👁 معاينة]  │  [⬇ تحميل]    │
  //  └──────────────────────────────────┘

  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn(
        'overflow-hidden rounded-xl border',
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

        {/* Separator */}
        <div className={cn('h-px', isSent ? 'bg-primary-foreground/15' : 'bg-border')} />

        {/* Action buttons */}
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
            معاينة
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
            تحميل
          </a>
        </div>
      </div>

      {caption && <p className="px-0.5 text-sm">{caption}</p>}

      {/* Viewer modal — mounted only when open to avoid premature blob fetch */}
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
