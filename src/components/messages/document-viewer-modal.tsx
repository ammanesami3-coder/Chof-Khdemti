'use client';

import { useState } from 'react';
import { Download, X, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getProxyDownloadUrl, isOfficeMime } from '@/lib/cloudinary-utils';
import { useLang } from '@/lib/i18n/language-context';

function stripSignature(url: string) {
  return url.replace(/\/s--[^/]+--\//, '/');
}

const MAX_OFFICE_BYTES = 10 * 1024 * 1024;

type Props = {
  url:       string;
  fileName:  string;
  mimeType?: string;
  fileSize?: number;
  onClose:   () => void;
};

export function DocumentViewerModal({ url, fileName, mimeType, fileSize, onClose }: Props) {
  const { t } = useLang();

  const isPdf      = !!(mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf'));
  const isOffice   = isOfficeMime(mimeType);
  const tooLarge   = isOffice && fileSize != null && fileSize > MAX_OFFICE_BYTES;
  const canPreview = isPdf || (isOffice && !tooLarge);

  const downloadUrl     = getProxyDownloadUrl(url, fileName);
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
            {t('downloadLabel')}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label={t('closeLabel')}
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
            errorTitle={t('fileViewErrorTitle')}
            errorBody={t('fileViewErrorHint')}
            openInTabLabel={t('openInTabLabel')}
            downloadLabel={t('downloadLabel')}
          />
        )}

        {isOffice && !tooLarge && (
          <OfficeFrame
            cloudinaryUrl={url}
            officeNote={t('officeViewerNote')}
          />
        )}

        {!canPreview && (
          <Fallback
            title={tooLarge ? t('fileTooLargeTitle') : t('fileTypeUnsupportedTitle')}
            body={tooLarge ? t('fileTooLargeHint') : t('fileTypeUnsupportedHint')}
            downloadUrl={downloadUrl}
            openUrl={proxyPreviewUrl}
            openInTabLabel={t('openInTabLabel')}
            downloadLabel={t('downloadLabel')}
          />
        )}
      </div>
    </DialogContent>
  );
}

// ── PDF viewer ──────────────────────────────────────────────────────────────────

function PdfFrame({
  proxyUrl, downloadUrl, errorTitle, errorBody, openInTabLabel, downloadLabel,
}: {
  proxyUrl: string; downloadUrl: string;
  errorTitle: string; errorBody: string;
  openInTabLabel: string; downloadLabel: string;
}) {
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
          title={errorTitle}
          body={errorBody}
          downloadUrl={downloadUrl}
          openUrl={proxyUrl}
          openInTabLabel={openInTabLabel}
          downloadLabel={downloadLabel}
        />
      )}
    </div>
  );
}

// ── Office Online Viewer ────────────────────────────────────────────────────────

function OfficeFrame({ cloudinaryUrl, officeNote }: { cloudinaryUrl: string; officeNote: string }) {
  const [loaded, setLoaded] = useState(false);
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
          {officeNote}
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
  title, body, downloadUrl, openUrl, openInTabLabel, downloadLabel,
}: {
  title: string; body: string; downloadUrl: string; openUrl: string;
  openInTabLabel: string; downloadLabel: string;
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
          {openInTabLabel}
        </a>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          {downloadLabel}
        </a>
      </div>
    </div>
  );
}
