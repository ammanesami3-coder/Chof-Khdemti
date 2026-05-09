'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCoordinates } from '@/lib/google-maps';
import { LocationViewerModal } from './location-viewer-modal';

// BubbleMap is a non-interactive Leaflet preview — no API key needed
const BubbleMapDynamic = dynamic(
  () => import('./location-map-inner').then((m) => m.BubbleMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
  },
);

export function parseLocationContent(content: string | null): { lat: number; lng: number; name: string } | null {
  if (!content) return null;
  try {
    const obj = JSON.parse(content);
    if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
      return { lat: obj.lat, lng: obj.lng, name: obj.name ?? 'موقع مشترك' };
    }
    return null;
  } catch {
    return null;
  }
}

type Props = {
  content:    string | null;
  isSent:     boolean;
  senderName: string;
};

export function LocationMessageCard({ content, isSent, senderName }: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const loc = parseLocationContent(content);

  if (!loc) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>موقع غير متاح</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        aria-label="عرض الموقع"
        className={cn(
          'relative w-[280px] overflow-hidden rounded-2xl text-start',
          'transition-opacity hover:opacity-90 active:opacity-80',
          isSent ? 'rounded-ee-sm' : 'rounded-es-sm',
        )}
      >
        {/* Map preview — Leaflet with OpenStreetMap tiles, no API key */}
        <div className="h-[180px] w-full overflow-hidden bg-muted">
          <BubbleMapDynamic lat={loc.lat} lng={loc.lng} />
        </div>

        {/* Info strip — overlaid at bottom of map */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/50 px-3 py-2 backdrop-blur-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-white opacity-90" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight text-white">{loc.name}</p>
            <p className="text-[10px] text-white/70">{formatCoordinates(loc.lat, loc.lng)}</p>
          </div>
        </div>
      </button>

      <LocationViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        lat={loc.lat}
        lng={loc.lng}
        name={loc.name}
        senderName={senderName}
      />
    </>
  );
}
