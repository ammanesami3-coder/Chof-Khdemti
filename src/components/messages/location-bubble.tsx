'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { LocationViewer } from './location-viewer';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

const BubbleMap = dynamic(
  () => import('./location-map-inner').then((m) => m.BubbleMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-muted/60 flex items-center justify-center">
        <MapPin className="h-6 w-6 text-muted-foreground/40" />
      </div>
    ),
  },
);

// ── Parse location from JSON content ─────────────────────────────────────────

export function parseLocationContent(content: string | null): { lat: number; lng: number; name: string } | null {
  if (!content) return null;
  try {
    const obj = JSON.parse(content);
    if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
      return { lat: obj.lat, lng: obj.lng, name: obj.name ?? '' };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  content:    string | null;
  isSent:     boolean;
  senderName: string;
};

export function LocationBubble({ content, isSent, senderName }: Props) {
  const { t } = useLang();
  const [viewerOpen, setViewerOpen] = useState(false);
  const loc = parseLocationContent(content);

  if (!loc) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>{t('locationUnavailable')}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        aria-label={t('viewLocationAriaLabel')}
        className={cn(
          'group w-[280px] overflow-hidden rounded-2xl text-start',
          'transition-opacity hover:opacity-90 active:opacity-80',
          isSent ? 'rounded-ee-sm' : 'rounded-es-sm',
        )}
      >
        {/* Mini map — 280×140 */}
        <div className="h-[140px] w-full overflow-hidden">
          <BubbleMap lat={loc.lat} lng={loc.lng} />
        </div>

        {/* Info footer */}
        <div className={cn(
          'flex items-start gap-2 px-3 py-2.5',
          isSent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}>
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">{loc.name || t('sharedLocation')}</p>
            <p className="text-[10px] opacity-60">
              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
            </p>
          </div>
          <span className={cn(
            'ms-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            isSent ? 'bg-primary-foreground/20' : 'bg-foreground/10',
          )}>
            {t('viewLabel')}
          </span>
        </div>
      </button>

      <LocationViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        lat={loc.lat}
        lng={loc.lng}
        name={loc.name || t('sharedLocation')}
        senderName={senderName}
      />
    </>
  );
}
