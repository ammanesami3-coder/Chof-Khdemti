"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Download, Minus, Plus, X, ZoomIn } from "lucide-react";
import { useLang } from "@/lib/i18n/language-context";

export type LightboxImage = {
  src: string;
  alt?: string;
};

interface MediaLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function MediaLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
}: MediaLightboxProps) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // ── Zoom / pan state ────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const isPanning = useRef(false);
  const panOrigin = useRef({ px: 0, py: 0, mx: 0, my: 0 });
  const lastTapTime = useRef(0);
  const lastPinchDist = useRef(0);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  // ── Embla ───────────────────────────────────────────────────────────────────
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex: initialIndex,
    direction: "ltr",
    // Disable drag when zoomed in — handled via containment below
    watchDrag: () => zoomRef.current <= 1,
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { setMounted(true); }, []);

  // Sync Embla index → state
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      resetZoom();
    };
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, resetZoom]);

  // Jump to correct slide & reset zoom when lightbox opens
  useEffect(() => {
    if (!open || !emblaApi) return;
    emblaApi.scrollTo(initialIndex, true);
    setSelectedIndex(initialIndex);
    resetZoom();
  }, [open, initialIndex, emblaApi, resetZoom]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Keyboard: ESC + arrows
  const scrollPrev = useCallback(() => { if (zoomRef.current <= 1) emblaApi?.scrollPrev(); }, [emblaApi]);
  const scrollNext = useCallback(() => { if (zoomRef.current <= 1) emblaApi?.scrollNext(); }, [emblaApi]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (zoom > 1) resetZoom(); else onClose(); }
      if (e.key === "ArrowLeft") scrollPrev();
      if (e.key === "ArrowRight") scrollNext();
      if (e.key === "+" || e.key === "=") setZoom((z) => clamp(z + 0.5, MIN_ZOOM, MAX_ZOOM));
      if (e.key === "-") setZoom((z) => { const n = clamp(z - 0.5, MIN_ZOOM, MAX_ZOOM); if (n <= 1) setPan({ x: 0, y: 0 }); return n; });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, zoom, onClose, scrollPrev, scrollNext, resetZoom]);

  // ── Zoom-image event handlers ────────────────────────────────────────────────

  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.3 : -0.3;
    setZoom((prev) => {
      const next = clamp(prev + delta, MIN_ZOOM, MAX_ZOOM);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (zoomRef.current > 1) {
      resetZoom();
    } else {
      setZoom(2.5);
    }
  }

  // Pointer events for panning
  function handlePointerDown(e: React.PointerEvent) {
    if (zoomRef.current <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isPanning.current = true;
    panOrigin.current = {
      px: panRef.current.x,
      py: panRef.current.y,
      mx: e.clientX,
      my: e.clientY,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isPanning.current) return;
    e.stopPropagation();
    setPan({
      x: panOrigin.current.px + (e.clientX - panOrigin.current.mx),
      y: panOrigin.current.py + (e.clientY - panOrigin.current.my),
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isPanning.current) return;
    e.stopPropagation();
    isPanning.current = false;
  }

  // Touch events for pinch-to-zoom
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
    // Double-tap detection
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        if (zoomRef.current > 1) resetZoom();
        else setZoom(2.5);
      }
      lastTapTime.current = now;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2) return;
    e.stopPropagation();
    const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
    const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
    const dist = Math.hypot(dx, dy);
    if (lastPinchDist.current > 0) {
      const ratio = dist / lastPinchDist.current;
      setZoom((prev) => {
        const next = clamp(prev * ratio, MIN_ZOOM, MAX_ZOOM);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
    lastPinchDist.current = dist;
  }

  function handleTouchEnd() {
    lastPinchDist.current = 0;
  }

  if (!open || images.length === 0 || !mounted) return null;

  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < images.length - 1;
  const currentSrc = images[selectedIndex]?.src;
  const isZoomed = zoom > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={t('imageGalleryAriaLabel')}
    >
      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={isZoomed ? resetZoom : onClose}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label={isZoomed ? t('resetZoomAriaLabel') : t('closeLabel')}
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="text-sm text-white/70" aria-live="polite">
              {selectedIndex + 1} / {images.length}
            </span>
          )}
          {/* Zoom level pill */}
          {isZoomed && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white">
              <ZoomIn className="size-3" />
              {Math.round(zoom * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            type="button"
            onClick={() => setZoom((z) => { const n = clamp(z - 0.5, MIN_ZOOM, MAX_ZOOM); if (n <= 1) setPan({ x: 0, y: 0 }); return n; })}
            disabled={zoom <= MIN_ZOOM}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            aria-label={t('zoomOutAriaLabel')}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z + 0.5, MIN_ZOOM, MAX_ZOOM))}
            disabled={zoom >= MAX_ZOOM}
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            aria-label={t('zoomInAriaLabel')}
          >
            <Plus className="size-4" />
          </button>
          {currentSrc && (
            <a
              href={currentSrc}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label={t('downloadImageAriaLabel')}
            >
              <Download className="size-5" />
            </a>
          )}
        </div>
      </div>

      {/* ── Carousel ──────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={emblaRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full">
            {images.map((img, i) => {
              const isActive = i === selectedIndex;
              const imgZoom = isActive ? zoom : 1;
              const imgPan = isActive ? pan : { x: 0, y: 0 };

              return (
                <div
                  key={i}
                  className="flex min-w-0 flex-[0_0_100%] items-center justify-center overflow-hidden"
                  // When zoomed: absorb all pointer events so Embla doesn't see them
                  onPointerDown={isActive ? handlePointerDown : undefined}
                  onPointerMove={isActive ? handlePointerMove : undefined}
                  onPointerUp={isActive ? handlePointerUp : undefined}
                  onPointerCancel={isActive ? handlePointerUp : undefined}
                  onWheel={isActive ? handleWheel : undefined}
                  onTouchStart={isActive ? handleTouchStart : undefined}
                  onTouchMove={isActive ? handleTouchMove : undefined}
                  onTouchEnd={isActive ? handleTouchEnd : undefined}
                  onDoubleClick={isActive ? handleDoubleClick : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.alt ?? ""}
                    draggable={false}
                    style={{
                      transform: `scale(${imgZoom}) translate(${imgPan.x / imgZoom}px, ${imgPan.y / imgZoom}px)`,
                      transition: isPanning.current ? "none" : "transform 0.15s ease-out",
                      cursor: isActive && isZoomed ? (isPanning.current ? "grabbing" : "grab") : "zoom-in",
                      touchAction: "none",
                      userSelect: "none",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop nav arrows — hidden when zoomed */}
        {images.length > 1 && !isZoomed && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canPrev}
              aria-label={t('prevImageAriaLabel')}
              className="absolute start-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
              <ChevronRight className="size-6" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canNext}
              aria-label={t('nextImageAriaLabel')}
              className="absolute end-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
              <ChevronLeft className="size-6" />
            </button>
          </>
        )}

        {/* Zoom hint — shown briefly on first open */}
        {!isZoomed && (
          <p className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/60 sm:hidden">
            {t('doubleTapToZoom')}
          </p>
        )}
      </div>

      {/* ── Dot indicators ────────────────────────────────── */}
      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { resetZoom(); emblaApi?.scrollTo(i); }}
              aria-label={`${t('imageNumberAriaLabel')} ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
