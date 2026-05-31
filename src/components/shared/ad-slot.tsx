"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  /** AdSense ad unit ID (data-ad-slot). Required to serve a real ad. */
  slot: string;
  /** Publisher ID (data-ad-client). Defaults to NEXT_PUBLIC_ADSENSE_CLIENT_ID. */
  client?: string;
  /** Fluid layout key (data-ad-layout-key). */
  layoutKey?: string;
  /** Extra classes for the outer card wrapper. */
  className?: string;
  /**
   * Safety height (px) reserved while the ad loads so the layout doesn't jump.
   * The skeleton fills this space until the ad renders.
   */
  minHeight?: number;
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

/**
 * Reusable native AdSense slot styled to match the standard Post Card.
 *
 * Requires the AdSense loader script to be present once globally, e.g. in the
 * root layout:
 *   <Script async strategy="afterInteractive"
 *     src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXX"
 *     crossOrigin="anonymous" />
 */
export function AdSlot({
  slot,
  client = ADSENSE_CLIENT,
  layoutKey = "-fb+5w+4e-db+86",
  className,
  minHeight = 280,
}: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Push once after mount; never throw if the script/window isn't ready.
    if (pushedRef.current) return;
    if (typeof window === "undefined") return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Script not loaded yet or ad blocker active — fail silently.
    }

    // Watch the <ins> for AdSense's status attribute to hide the skeleton
    // once the ad is filled (or explicitly unfilled).
    const el = insRef.current;
    if (!el) return;

    const isResolved = () => {
      const status = el.getAttribute("data-ad-status");
      return status === "filled" || status === "unfilled";
    };

    if (isResolved()) {
      setLoaded(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (isResolved()) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    observer.observe(el, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4",
        className
      )}
      aria-label="إعلان"
    >
      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        إعلان
      </span>

      {!loaded && (
        <div
          className="absolute inset-x-4 bottom-4 animate-pulse rounded-lg bg-muted"
          style={{ top: "2.25rem" }}
          aria-hidden="true"
        />
      )}

      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="fluid"
        data-ad-layout-key={layoutKey}
      />
    </aside>
  );
}
