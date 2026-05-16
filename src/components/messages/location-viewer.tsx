'use client';

import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLang } from '@/lib/i18n/language-context';

const ViewerMap = dynamic(
  () => import('./location-map-inner').then((m) => m.ViewerMap),
  { ssr: false, loading: () => <div className="flex-1 animate-pulse bg-muted" /> },
);

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  lat:          number;
  lng:          number;
  name:         string;
  senderName:   string;
};

export function LocationViewer({ open, onOpenChange, lat, lng, name, senderName }: Props) {
  const { t } = useLang();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('viewLocationTitle')}</DialogTitle>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-sm">📍 {name}</p>
            <p className="text-[11px] text-muted-foreground">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label={t('closeLabel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Map fills remaining height */}
        <ViewerMap
          lat={lat}
          lng={lng}
          senderName={senderName}
          className="flex-1 overflow-hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
