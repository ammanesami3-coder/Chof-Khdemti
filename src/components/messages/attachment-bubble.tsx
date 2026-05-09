'use client';

import { useState, useCallback } from 'react';
import { Download, Eye, FileText, FileSpreadsheet, Presentation, File as FileIcon, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AttachmentMetadata } from '@/lib/actions/messages';

type Props = {
  messageType: 'image' | 'video' | 'document' | 'audio';
  url:         string;
  metadata:    AttachmentMetadata;
  isSent:      boolean;
  caption?:    string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function DocIcon({ mime }: { mime?: string }) {
  if (!mime) return <FileIcon className="h-5 w-5" />;
  if (mime.includes('pdf'))                                          return <FileText className="h-5 w-5 text-red-500" />;
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
                                                                     return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return <Presentation className="h-5 w-5 text-orange-500" />;
  return <FileText className="h-5 w-5 text-blue-500" />;
}

// Fetch the file client-side and trigger a save-as dialog with the correct filename.
// Avoids the cross-origin restriction that ignores the <a download> attribute.
async function clientDownload(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // If CORS blocks the fetch, open in a new tab so the user can save manually
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function AttachmentBubble({ messageType, url, metadata, isSent, caption }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pdfOpen, setPdfOpen]           = useState(false);
  const [downloading, setDownloading]   = useState(false);

  const filename = metadata.filename ?? (metadata.mime_type?.includes('pdf') ? 'document.pdf' : 'document');

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    await clientDownload(url, filename);
    setDownloading(false);
  }, [url, filename]);

  // ── Image ─────────────────────────────────────────────────────────────────

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

  // ── Video ─────────────────────────────────────────────────────────────────

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

  // ── Audio ─────────────────────────────────────────────────────────────────

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

  // ── PDF ───────────────────────────────────────────────────────────────────

  const isPdf = metadata.mime_type?.includes('pdf');

  if (isPdf) {
    // Google Docs Viewer fetches the PDF from its own servers — no CORS or
    // Content-Disposition issues, works with any publicly accessible URL.
    const viewerSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setPdfOpen(true)}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-opacity hover:opacity-80',
            isSent ? 'bg-primary-foreground/10' : 'bg-black/5',
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
            <FileText className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{filename}</p>
            {metadata.size && (
              <p className="text-[10px] text-muted-foreground">{formatBytes(metadata.size)}</p>
            )}
          </div>
          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {caption && <p className="px-0.5 text-sm">{caption}</p>}

        <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
          <DialogContent className="max-w-3xl w-[95vw] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogTitle className="sr-only">{filename}</DialogTitle>
            <div className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-2.5">
              <span className="truncate text-sm font-medium">{filename}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent transition-colors disabled:opacity-50"
                  aria-label="تنزيل"
                >
                  {downloading
                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    : <Download className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPdfOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <iframe
              src={viewerSrc}
              className="flex-1 w-full border-0"
              title={filename}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Other documents (DOCX, XLSX, PPTX …) ─────────────────────────────────
  // Client-side fetch → blob URL → programmatic click preserves original filename.

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80 disabled:opacity-60',
          isSent ? 'bg-primary-foreground/10' : 'bg-black/5',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
          <DocIcon mime={metadata.mime_type} />
        </div>
        <div className="min-w-0 flex-1 text-start">
          <p className="truncate text-xs font-medium">{filename}</p>
          {metadata.size && (
            <p className="text-[10px] text-muted-foreground">{formatBytes(metadata.size)}</p>
          )}
        </div>
        {downloading
          ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          : <Download className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {caption && <p className="px-0.5 text-sm">{caption}</p>}
    </div>
  );
}
