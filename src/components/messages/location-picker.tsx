'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Leaflet map loaded client-side only
const PickerMap = dynamic(
  () => import('./location-map-inner').then((m) => m.PickerMap),
  { ssr: false, loading: () => <div className="flex-1 animate-pulse bg-muted" /> },
);

// ── Nominatim reverse geocoding ───────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { 'Accept-Language': 'ar,fr;q=0.8' } },
    );
    const json = await res.json();
    const addr = json.address ?? {};
    return (
      addr.city      ||
      addr.town      ||
      addr.village   ||
      addr.suburb    ||
      addr.county    ||
      json.display_name?.split(',').slice(0, 2).join(', ') ||
      'موقع مشترك'
    );
  } catch {
    return 'موقع مشترك';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PickedLocation = {
  lat:  number;
  lng:  number;
  name: string;
};

type Props = {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm:    (loc: PickedLocation) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationPicker({ open, onOpenChange, onConfirm }: Props) {
  const DEFAULT_LAT = 33.5731;  // Casablanca as default
  const DEFAULT_LNG = -7.5898;

  const [tab, setTab]         = useState<'current' | 'map'>('current');
  const [loading, setLoading] = useState(false);
  const [picked, setPicked]   = useState<PickedLocation | null>(null);
  const [mapPos, setMapPos]   = useState<[number, number]>([DEFAULT_LAT, DEFAULT_LNG]);
  const [mapName, setMapName] = useState<string>('');

  const handleGetCurrent = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    setPicked(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        setPicked({ lat, lng, name });
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const handleMapPick = useCallback(async (lat: number, lng: number) => {
    setMapPos([lat, lng]);
    setMapName('...');
    const name = await reverseGeocode(lat, lng);
    setMapName(name);
    setPicked({ lat, lng, name: name || 'موقع مشترك' });
  }, []);

  const handleConfirm = () => {
    if (!picked) return;
    onConfirm(picked);
    onOpenChange(false);
    setPicked(null);
    setMapName('');
  };

  const handleOpenMap = async () => {
    setTab('map');
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapPos([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">إرسال موقع</DialogTitle>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-semibold">إرسال موقع</span>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b">
          <button
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              tab === 'current'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab('current')}
          >
            موقعي الحالي
          </button>
          <button
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              tab === 'map'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={handleOpenMap}
          >
            اختيار من الخريطة
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {tab === 'current' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              {!picked && !loading && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Navigation className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    سيتم مشاركة موقعك الحالي مع الطرف الآخر
                  </p>
                  <Button onClick={handleGetCurrent} className="w-full max-w-xs">
                    <Navigation className="me-2 h-4 w-4" />
                    تحديد موقعي الحالي
                  </Button>
                </>
              )}

              {loading && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري تحديد الموقع…</p>
                </div>
              )}

              {picked && !loading && (
                <div className="w-full max-w-xs space-y-3">
                  <div className="rounded-xl border bg-accent/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">الموقع المحدد</p>
                    <p className="mt-0.5 font-semibold">{picked.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                    </p>
                  </div>
                  <Button onClick={handleConfirm} className="w-full">
                    إرسال الموقع
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleGetCurrent} className="w-full">
                    إعادة التحديد
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === 'map' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Interactive map */}
              <div className="relative flex-1 overflow-hidden">
                <PickerMap
                  lat={mapPos[0]}
                  lng={mapPos[1]}
                  onPick={handleMapPick}
                  className="h-full w-full"
                />
                {/* Hint */}
                <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-[11px] shadow backdrop-blur-sm">
                  اضغط على الخريطة أو اسحب المؤشر لاختيار الموقع
                </div>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 border-t bg-background p-3">
                {mapName && mapName !== '...' && (
                  <p className="mb-2 text-center text-xs font-medium text-foreground">{mapName}</p>
                )}
                {mapName === '...' && (
                  <p className="mb-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    جاري تحديد الاسم…
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={!picked}
                  onClick={handleConfirm}
                >
                  إرسال هذا الموقع
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
