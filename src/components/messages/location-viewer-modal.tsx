'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { X, Navigation, ExternalLink, MapPin, Route } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getDirectionsUrl, getMapsUrl, formatCoordinates } from '@/lib/google-maps';

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number;
  lng: number;
  name: string;
  senderName: string;
};

export function LocationViewerModal({ open, onOpenChange, lat, lng, name, senderName }: Props) {
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(p);
        setDistance(formatDist(haversineKm(lat, lng, p.lat, p.lng)));
      },
      () => setTracking(false),
      { enableHighAccuracy: true },
    );
  }, [lat, lng]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setMyPos(null);
    setDistance(null);
  }, []);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  useEffect(() => {
    if (!open) stopTracking();
  }, [open, stopTracking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">عرض الموقع</DialogTitle>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
          <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{name}</p>
            <p className="text-[11px] text-muted-foreground">{formatCoordinates(lat, lng)}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Map */}
        <div className="relative flex-1 overflow-hidden">
          <APIProvider apiKey={GMAPS_KEY}>
            <Map
              defaultCenter={{ lat, lng }}
              defaultZoom={15}
              mapId="location-viewer"
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Destination marker */}
              <AdvancedMarker position={{ lat, lng }} title={senderName} />

              {/* My location marker */}
              {myPos && (
                <AdvancedMarker position={myPos} title="موقعك">
                  <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-md" />
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>

          {/* Distance badge */}
          {distance && (
            <div className="absolute top-3 start-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
              📏 {distance}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-background px-3 py-2.5">
          <button
            type="button"
            onClick={tracking ? stopTracking : startTracking}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              tracking
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20',
            )}
          >
            <Navigation className="h-3.5 w-3.5" />
            {tracking ? 'إيقاف التتبع' : 'تتبعي'}
          </button>

          <a
            href={getDirectionsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-500/20 dark:text-green-400"
          >
            <Route className="h-3.5 w-3.5" />
            اتجاهات
          </a>

          <a
            href={getMapsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="ms-auto flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            فتح في Google Maps
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
