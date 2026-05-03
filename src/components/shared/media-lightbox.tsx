"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

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

export function MediaLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
}: MediaLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Embla — LTR direction regardless of page RTL (standard image gallery UX)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex: initialIndex,
    direction: "ltr",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected index from Embla
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Jump to correct slide when lightbox opens
  useEffect(() => {
    if (!open || !emblaApi) return;
    emblaApi.scrollTo(initialIndex, true);
    setSelectedIndex(initialIndex);
  }, [open, initialIndex, emblaApi]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keyboard: ESC + arrows
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") scrollPrev();
      if (e.key === "ArrowRight") scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, scrollPrev, scrollNext]);

  if (!open || images.length === 0 || !mounted) return null;

  const canPrev = selectedIndex > 0;
  const canNext = selectedIndex < images.length - 1;
  const currentSrc = images[selectedIndex]?.src;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="معرض الصور"
    >
      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="إغلاق"
        >
          <X className="size-5" />
        </button>

        {images.length > 1 && (
          <span className="text-sm text-white/70" aria-live="polite">
            {selectedIndex + 1} / {images.length}
          </span>
        )}

        {currentSrc ? (
          <a
            href={currentSrc}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="تحميل الصورة"
          >
            <Download className="size-5" />
          </a>
        ) : (
          <div className="size-9" /> /* spacer to keep counter centred */
        )}
      </div>

      {/* ── Carousel ──────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <div ref={emblaRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full">
            {images.map((img, i) => (
              <div
                key={i}
                className="flex min-w-0 flex-[0_0_100%] items-center justify-center p-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt ?? ""}
                  className="max-h-full max-w-full select-none object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop arrows — only shown if multiple images */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canPrev}
              aria-label="الصورة السابقة"
              className="absolute start-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
              <ChevronRight className="size-6" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canNext}
              aria-label="الصورة التالية"
              className="absolute end-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 sm:flex"
            >
              <ChevronLeft className="size-6" />
            </button>
          </>
        )}
      </div>

      {/* ── Dot indicators ────────────────────────────────── */}
      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`الصورة ${i + 1}`}
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
