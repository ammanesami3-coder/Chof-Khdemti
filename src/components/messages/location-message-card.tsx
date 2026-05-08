'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStaticMapUrl, getDirectionsUrl, formatCoordinates } from '@/lib/google-maps';
import { LocationViewerModal } from './location-viewer-modal';

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
  content: string | null;
  isSent: boolean;
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

  const staticMapUrl = getStaticMapUrl(loc.lat, loc.lng, 15, 560, 280);

  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        aria-label="عرض الموقع"
        className={cn(
          'group w-[280px] overflow-hidden rounded-2xl text-start',
          'transition-opacity hover:opacity-90 active:opacity-80',
          isSent ? 'rounded-ee-sm' : 'rounded-es-sm',
        )}
      >
        {/* Static map preview — 280 × 140 */}
        <div className="relative h-[140px] w-full overflow-hidden bg-muted">
          <Image
            src={staticMapUrl}
            alt={`خريطة ${loc.name}`}
            fill
            sizes="280px"
            className="object-cover"
            unoptimized
          />
          {/* Open-in-maps shortcut */}
          <a
            href={getDirectionsUrl(loc.lat, loc.lng)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow backdrop-blur-sm transition-colors hover:bg-white"
            aria-label="فتح في Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5 text-foreground" />
          </a>
        </div>

        {/* Info footer */}
        <div className={cn(
          'flex items-start gap-2 px-3 py-2.5',
          isSent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}>
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight">{loc.name}</p>
            <p className="text-[10px] opacity-60">{formatCoordinates(loc.lat, loc.lng)}</p>
          </div>
          <span className={cn(
            'ms-auto shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-medium',
            isSent ? 'bg-primary-foreground/20' : 'bg-foreground/10',
          )}>
            عرض
          </span>
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
