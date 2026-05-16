"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Minus, Plus, X, ZoomIn } from "lucide-react";
import { useLang } from "@/lib/i18n/language-context";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
  allowDownload?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
  allowDownload = false,
}: ImageLightboxProps) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
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

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Reset zoom when opening a new image
  useEffect(() => {
    if (open) resetZoom();
  }, [open, src, resetZoom]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (zoomRef.current > 1) resetZoom(); else onClose(); }
      if (e.key === "+" || e.key === "=") setZoom((z) => clamp(z + 0.5, MIN_ZOOM, MAX_ZOOM));
      if (e.key === "-") setZoom((z) => { const n = clamp(z - 0.5, MIN_ZOOM, MAX_ZOOM); if (n <= 1) setPan({ x: 0, y: 0 }); return n; });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, resetZoom]);

  // ── Event handlers ──────────────────────────────────────────────────────────

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
    if (zoomRef.current > 1) resetZoom();
    else setZoom(2.5);
  }

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

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
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

  if (!open || !mounted) return null;

  const isZoomed = zoom > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={isZoomed ? resetZoom : onClose}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label={isZoomed ? t('resetZoomAriaLabel') : t('closeLabel')}
        >
          <X className="size-5" />
        </button>

        {/* Zoom level pill */}
        {isZoomed && (
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white">
            <ZoomIn className="size-3" />
            {Math.round(zoom * 100)}%
          </span>
        )}

        <div className="flex items-center gap-1">
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
          {allowDownload && (
            <a
              href={src}
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

      {/* ── Image area ──────────────────────────────────────────────── */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onClick={!isZoomed ? onClose : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isPanning.current ? "none" : "transform 0.15s ease-out",
            cursor: isZoomed ? (isPanning.current ? "grabbing" : "grab") : "zoom-in",
            touchAction: "none",
            userSelect: "none",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Mobile double-tap hint */}
      {!isZoomed && (
        <p className="pointer-events-none shrink-0 pb-4 text-center text-[11px] text-white/50 sm:hidden">
          {t('doubleTapToZoom')}
        </p>
      )}
    </div>,
    document.body,
  );
}
