"use client";

/**
 * UserAvatar — the single, unified avatar component for the whole platform.
 *
 * It is also the canonical "presence avatar": pass a user id and it shows the
 * online dot automatically, driven by Realtime Presence. There is intentionally
 * no separate <PresenceAvatar> — duplicating avatar markup is exactly what
 * caused the circular-clip bug, so all presence logic lives here.
 *
 * Online dot resolution (in priority order):
 *   1. `showOnline` prop, if explicitly passed (true/false) — hard override.
 *   2. otherwise, auto: useIsOnline(userId ?? user.id).
 *
 * A user who enabled "appear offline" never tracks Realtime Presence, so the
 * dot is privacy-correct without any extra check here.
 *
 * Circular clipping: the clip layer is `absolute inset-0` (a real, positioned
 * box) so `overflow-hidden` actually clips the `<Image fill>`. An *inline*
 * span with `overflow-hidden` does NOT clip an absolutely-positioned child —
 * that bug turned avatars into squares.
 */

import Image from "next/image";
import Link from "next/link";
import { cn, getInitials } from "@/lib/utils";
import { useLang } from "@/lib/i18n/language-context";
import { useIsOnline } from "@/hooks/use-is-online";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  user: {
    username: string;
    full_name: string;
    avatar_url?: string | null;
    /** optional — when present, enables the auto online dot */
    id?: string;
  };
  /** xs=24 sm=32 md=40 lg=56 xl=80 */
  size?: AvatarSize;
  /** true by default — wraps in a Link to /profile/username */
  linkable?: boolean;
  /**
   * Explicit user id for presence. Falls back to `user.id`.
   * When a valid id resolves, the online dot appears automatically.
   */
  userId?: string;
  /**
   * Hard override for the online dot. Leave undefined to use auto presence.
   * `false` hides the dot even if the user is online.
   */
  showOnline?: boolean;
  className?: string;
}

const DIM: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
};

const FONT: Record<AvatarSize, string> = {
  xs: "text-[9px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

const PX: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

/** Online dot: size + border scale with the avatar so it stays proportional. */
const DOT: Record<AvatarSize, string> = {
  xs: "size-2 border-[1.5px]",
  sm: "size-2.5 border-2",
  md: "size-2.5 border-2",
  lg: "size-3.5 border-2",
  xl: "size-4 border-[3px]",
};

/**
 * The green online indicator — small, professional, with a soft glow.
 * Rendered as a sibling of the (clipped) image so it is never cut off.
 */
function OnlineDot({ size }: { size: AvatarSize }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        // small inset so the dot hugs the circular edge instead of the
        // bounding-box corner (where a circle has no pixels).
        "absolute bottom-[6%] end-[6%] z-10 rounded-full border-background bg-green-500",
        "shadow-[0_0_5px_1px_rgba(34,197,94,0.65)]",
        DOT[size],
      )}
    />
  );
}

export function UserAvatar({
  user,
  size = "md",
  linkable = true,
  userId,
  showOnline,
  className,
}: UserAvatarProps) {
  const { t } = useLang();
  const dim = DIM[size];
  const font = FONT[size];
  const px = PX[size];

  // Always call the hook (rules of hooks); it returns false for empty ids.
  const resolvedId = userId ?? user.id;
  const autoOnline = useIsOnline(resolvedId);
  const online = showOnline ?? autoOnline;

  const inner = (
    // Outer wrapper: relative (anchors the dot), sized, NO overflow-hidden.
    <span
      className={cn("relative inline-block shrink-0 select-none", dim, className)}
    >
      {/* Clip layer: absolute+inset-0 makes it a positioned box, so
          overflow-hidden actually clips the <Image fill> into a circle. */}
      <span className="absolute inset-0 overflow-hidden rounded-full bg-muted">
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.full_name}
            fill
            sizes={`${px}px`}
            className="object-cover"
          />
        ) : (
          <span
            className={cn(
              "flex size-full items-center justify-center font-semibold text-white",
              font,
            )}
            style={{ background: "var(--brand-gradient)" }}
          >
            {getInitials(user.full_name)}
          </span>
        )}
      </span>

      {online && <OnlineDot size={size} />}
    </span>
  );

  if (!linkable) return inner;

  return (
    <Link
      href={`/profile/${user.username}`}
      aria-label={`${t("visitProfileOfPrefix")} ${user.full_name}`}
      className={cn(
        "inline-flex shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}
