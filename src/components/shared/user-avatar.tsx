import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  user: {
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
  /** xs=24 sm=32 md=40 lg=56 xl=80 */
  size?: AvatarSize;
  /** true بالافتراضي — يلفّ بـ Link لـ /profile/username */
  linkable?: boolean;
  /** نقطة خضراء للـ online indicator */
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

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  user,
  size = "md",
  linkable = true,
  showOnline = false,
  className,
}: UserAvatarProps) {
  const dim = DIM[size];
  const font = FONT[size];
  const px = PX[size];

  const inner = (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full select-none",
        dim,
        className,
      )}
    >
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
            "flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 font-semibold text-white",
            font,
          )}
        >
          {initials(user.full_name)}
        </span>
      )}

      {showOnline && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 end-0 size-2.5 rounded-full border-2 border-background bg-green-500"
        />
      )}
    </span>
  );

  if (!linkable) return inner;

  return (
    <Link
      href={`/profile/${user.username}`}
      aria-label={`زيارة ملف ${user.full_name}`}
      className={cn(
        "inline-flex shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}
