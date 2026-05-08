"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Hls from "hls.js";
import type { PostMedia } from "@/lib/validations/post";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

interface OptimizedVideoProps {
  item: PostMedia;
  className?: string;
}

function buildHlsUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/sp_auto/${publicId}.m3u8`;
}

function buildFallbackUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto:eco/${publicId}.mp4`;
}

// Custom event name for singleton video coordination
const VIDEO_PLAYING_EVENT = "video:singleton-play";

export function OptimizedVideo({ item, className = "" }: OptimizedVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const wasPlayingRef = useRef(false);
  // Stable ID to identify this instance among all mounted videos
  const instanceId = useRef(`v-${Math.random().toString(36).slice(2)}`);
  const [inView, setInView] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Singleton: broadcast when this video starts playing ───────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onPlay() {
      window.dispatchEvent(
        new CustomEvent(VIDEO_PLAYING_EVENT, { detail: { id: instanceId.current } })
      );
    }
    video.addEventListener("play", onPlay);
    return () => video.removeEventListener("play", onPlay);
  }, []);

  // ── Singleton: pause this video when another one starts ───────────────────
  useEffect(() => {
    function onOtherVideoPlaying(e: Event) {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (id === instanceId.current) return;
      const video = videoRef.current;
      if (!video || video.paused) return;
      video.pause();
      // Don't restore on scroll-back; the user chose another video intentionally
      wasPlayingRef.current = false;
    }
    window.addEventListener(VIDEO_PLAYING_EVENT, onOtherVideoPlaying);
    return () => window.removeEventListener(VIDEO_PLAYING_EVENT, onOtherVideoPlaying);
  }, []);

  // ── Lazy init: trigger once when near viewport ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Auto pause/resume when scrolling in and out of viewport ───────────────
  useEffect(() => {
    if (!inView) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry?.isIntersecting) {
          // Resume only if it was playing before scroll
          if (wasPlayingRef.current) {
            video.play().catch(() => {});
          }
        } else {
          // Save play state then pause
          wasPlayingRef.current = !video.paused;
          video.pause();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  // ── Initialize playback once in view ───────────────────────────────────────
  useEffect(() => {
    if (!inView || !videoRef.current) return;
    const video = videoRef.current;

    // Destroy any previous HLS instance
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const publicId = item.publicId;

    if (publicId && CLOUD_NAME) {
      const hlsUrl = buildHlsUrl(publicId);
      const fallbackUrl = buildFallbackUrl(publicId);

      if (Hls.isSupported()) {
        setLoading(true);
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          // Start with lowest quality then adapt up
          startLevel: -1,
        });
        hlsRef.current = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            // HLS failed (e.g. streaming profile not set up) → fall back to MP4
            hls.destroy();
            hlsRef.current = null;
            video.src = fallbackUrl;
            setLoading(false);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari: native HLS support
        setLoading(true);
        video.src = hlsUrl;
        video.addEventListener("loadedmetadata", () => setLoading(false), {
          once: true,
        });
        video.addEventListener("error", () => {
          video.src = fallbackUrl;
          setLoading(false);
        }, { once: true });
      } else {
        // No HLS support → direct MP4
        video.src = fallbackUrl;
      }
    } else {
      // No publicId (old posts) → use stored URL directly
      video.src = item.url;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [inView, item.publicId, item.url]);

  return (
    <div ref={containerRef} className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={item.thumbnail}
        controls
        playsInline
        preload="none"
        className="h-full w-full object-contain"
        aria-label="مقطع فيديو"
      />
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-white/80" />
        </div>
      )}
    </div>
  );
}
