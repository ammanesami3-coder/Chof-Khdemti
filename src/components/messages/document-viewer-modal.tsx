'use client';

import { useState } from 'react';
import { Download, X, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProxyDownloadUrl, isOfficeMime } from '@/lib/cloudinary-utils';

// Strips Cloudinary upload-signature so the URL works as a public delivery URL.
function stripSignature(url: string) {
  return url.replace(/\/s--[^/]+--\//, '/');
}

const MAX_OFFICE_BYTES = 10 * 1024 * 1024; // 10 MB — Office Online Viewer limit

type Props = {
  url:       string;
  fileName:  string;
  mimeType?: string;
  fileSize?: number;
  onClose:   () => void;
};

export function DocumentViewerModal({ url, fileName, mimeType, fileSize, onClose }: Props) {
  const isPdf      = !!(mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf'));
  const isOffice   = isOfficeMime(mimeType);
  const tooLarge   = isOffice && fileSize != null && fileSize > MAX_OFFICE_BYTES;
  const canPreview = isPdf || (isOffice && !tooLarge);

  // Download URL → proxy route with filename → Content-Disposition: attachment
  const downloadUrl = getProxyDownloadUrl(url, fileName);

  // Preview URL → proxy route without filename → Content-Disposition: inline
  // Built from the ORIGINAL Cloudinary URL (not from downloadUrl or any other proxy URL)
  const proxyPreviewUrl = `/api/cloudinary/view?url=${encodeURIComponent(url)}`;

  return (
    <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
      <DialogTitle className="sr-only">{fileName}</DialogTitle>

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-4 border-b bg-background px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</span>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            تحميل
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="relative flex-1 overflow-hidden">
        {isPdf && (
          <PdfFrame
            proxyUrl={proxyPreviewUrl}
            downloadUrl={downloadUrl}
          />
        )}

        {isOffice && !tooLarge && (
          // Office Online fetches directly from Cloudinary — pass the clean public URL
          <OfficeFrame cloudinaryUrl={url} />
        )}

        {!canPreview && (
          <Fallback
            title={tooLarge ? 'الملف كبير جداً للمعاينة' : 'هذا النوع غير مدعوم للمعاينة'}
            body={tooLarge
              ? 'المعاينة المباشرة تعمل على ملفات أقل من 10 MB'
              : 'حمّل الملف وافتحه بالتطبيق المناسب على جهازك'}
            downloadUrl={downloadUrl}
            openUrl={proxyPreviewUrl}
          />
        )}
      </div>
    </DialogContent>
  );
}

// ── PDF viewer ──────────────────────────────────────────────────────────────────
// Receives the already-computed proxy URL and places it directly in an iframe.
// The proxy route fetches from Cloudinary server-side and returns:
//   Content-Type: application/pdf  +  Content-Disposition: inline
// → browser renders the PDF natively without any CORS issues.

function PdfFrame({ proxyUrl, downloadUrl }: { proxyUrl: string; downloadUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-full w-full">
      {!loaded && !failed && <Spinner />}
      {!failed ? (
        <iframe
          src={proxyUrl}
          className="h-full w-full border-0"
          title="PDF viewer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <Fallback
          title="تعذّر عرض الملف"
          body="حاول فتح الملف في تبويب جديد أو تحميله مباشرة"
          downloadUrl={downloadUrl}
          openUrl={proxyUrl}
        />
      )}
    </div>
  );
}

// ── Office Online Viewer ────────────────────────────────────────────────────────
// Microsoft's servers fetch the file URL directly — pass the clean Cloudinary URL.
// Our proxy is NOT used here: Office Online needs a publicly reachable URL,
// and localhost/dev proxies won't work. Cloudinary public URLs always work.

function OfficeFrame({ cloudinaryUrl }: { cloudinaryUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  // Strip signature — the public delivery URL is what Microsoft needs
  const cleanUrl  = stripSignature(cloudinaryUrl);
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;

  return (
    <div className="relative h-full w-full">
      {!loaded && <Spinner />}
      <iframe
        src={viewerUrl}
        className="h-full w-full border-0"
        title="Office viewer"
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-muted-foreground pointer-events-none select-none">
          المعاينة عبر Microsoft Office Online · الملف يُعالَج على سيرفرات Microsoft
        </p>
      )}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function Fallback({
  title, body, downloadUrl, openUrl,
}: {
  title: string; body: string; downloadUrl: string; openUrl: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground opacity-40" />
      <div className="space-y-1.5">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs">{body}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          فتح في تبويب
        </a>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          تحميل
        </a>
      </div>
    </div>
  );
}
