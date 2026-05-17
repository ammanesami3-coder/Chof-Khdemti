'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';

// Fix Leaflet default marker icon paths (broken in Next.js / webpack)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as unknown as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});

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

function formatDist(km: number, mLabel: string, kmLabel: string): string {
  if (km < 1) return `${Math.round(km * 1000)} ${mLabel}`;
  return `${km.toFixed(1)} ${kmLabel}`;
}

// ── PickerClick: updates marker on click for the picker map ───────────────────

function PickerClick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BubbleMap — tiny non-interactive preview
// ══════════════════════════════════════════════════════════════════════════════

export function BubbleMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      dragging={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      className="pointer-events-none"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={blueIcon} />
    </MapContainer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PickerMap — interactive map for choosing location
// ══════════════════════════════════════════════════════════════════════════════

type PickerMapProps = {
  lat:      number;
  lng:      number;
  onPick:   (lat: number, lng: number) => void;
  className?: string;
};

export function PickerMap({ lat, lng, onPick, className }: PickerMapProps) {
  const { t } = useLang();
  const markerRef = useRef<L.Marker>(null);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      className={className}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <PickerClick onPick={onPick} />
      <Marker
        ref={markerRef}
        position={[lat, lng]}
        icon={blueIcon}
        draggable
        eventHandlers={{
          dragend(e) {
            const m = e.target as L.Marker;
            const { lat: la, lng: lo } = m.getLatLng();
            onPick(la, lo);
          },
        }}
      >
        <Popup>{t('selectedLocationLabel')}</Popup>
      </Marker>
    </MapContainer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ViewerMap — full-screen map with optional live tracking
// ══════════════════════════════════════════════════════════════════════════════

type ViewerMapProps = {
  lat:         number;
  lng:         number;
  senderName:  string;
  className?:  string;
};

export function ViewerMap({ lat, lng, senderName, className }: ViewerMapProps) {
  const { t } = useLang();
  const [myPos, setMyPos]       = useState<[number, number] | null>(null);
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState<string | null>(null);
  const watchIdRef              = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyPos([latitude, longitude]);
        setDistance(formatDist(haversineKm(lat, lng, latitude, longitude), t('metersUnit'), t('kmUnit')));
      },
      () => setTracking(false),
      { enableHighAccuracy: true },
    );
  }, [t, lat, lng]);

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

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* Controls bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        {distance && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            📏 {distance}
          </span>
        )}
        <button
          type="button"
          onClick={tracking ? stopTracking : startTracking}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            tracking
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-primary/10 text-primary hover:bg-primary/20',
          )}
        >
          {tracking ? t('stopTrackingLabel') : t('startTrackingLabel')}
        </button>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ms-auto rounded-full bg-accent px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/80"
        >
          {t('openInGoogleMaps')}
        </a>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Sender marker */}
          <Marker position={[lat, lng]} icon={blueIcon}>
            <Popup>{senderName}</Popup>
          </Marker>

          {/* My location marker + polyline */}
          {myPos && (
            <>
              <Marker position={myPos} icon={greenIcon}>
                <Popup>{t('myCurrentLocation')}</Popup>
              </Marker>
              <Polyline
                positions={[[lat, lng], myPos]}
                pathOptions={{ color: '#3B82F6', weight: 3, dashArray: '6 6' }}
              />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
