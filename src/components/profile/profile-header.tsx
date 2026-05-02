import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Briefcase, Clock, MessageCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/shared/auth-gate';
import { RatingDisplay } from '@/components/rating/rating-display';
import { getCraftById } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';

type ProfileUser = {
  id: string;
  username: string;
  full_name: string;
  account_type: string;
};

type ProfileData = {
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  craft_category: string | null;
  city: string | null;
  years_experience: number | null;
  is_verified: boolean;
};

type CurrentUser = {
  id: string;
  account_type: string;
} | null;

type Props = {
  user: ProfileUser;
  profile: ProfileData;
  avgRating: number | null;
  totalRatingsCount: number;
  currentUser: CurrentUser;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isPending: boolean;
  onToggleFollow: () => void;
  hasActiveStatus?: boolean;
  onViewStatus?: () => void;
};

export function ProfileHeader({
  user,
  profile,
  avgRating,
  totalRatingsCount,
  currentUser,
  isAuthenticated,
  isFollowing,
  isPending,
  onToggleFollow,
  hasActiveStatus = false,
  onViewStatus,
}: Props) {
  const isOwnProfile = currentUser?.id === user.id;

  const craft = profile.craft_category ? getCraftById(profile.craft_category) : null;
  const cityName = profile.city
    ? (CITIES.find((c) => c.id === profile.city)?.name_ar ?? profile.city)
    : null;

  // نُظهر الأزرار للزوار أيضاً — AuthGate يعترض النقر ويوجّه لتسجيل الدخول
  const showFollowBtn = !isOwnProfile;
  const showMessageBtn = !isOwnProfile && user.account_type === 'artisan';

  const initials = user.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* ── Cover ─────────────────────────────────────────── */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-l from-red-600 to-green-600 sm:h-52">
        {profile.cover_url && (
          <Image
            src={profile.cover_url}
            alt="غلاف الملف الشخصي"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}

        {/* Edit button — top-left (RTL) */}
        {isOwnProfile && (
          <div className="absolute start-3 top-3">
            <Link href="/profile/edit">
              <Button size="sm" variant="secondary" className="gap-1.5 opacity-90">
                <Pencil className="size-3.5" />
                تعديل الملف
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Avatar overlap ────────────────────────────────── */}
      <div className="relative px-4">
        <div className="-mt-16 mb-3 inline-block">
          {hasActiveStatus && onViewStatus ? (
            /* Gradient ring — user has an active status */
            <button
              onClick={onViewStatus}
              aria-label="عرض الحالة"
              className="rounded-full bg-gradient-to-tr from-red-600 via-orange-400 to-green-500 p-[3px] transition-opacity hover:opacity-90"
            >
              <div className="rounded-full border-4 border-background bg-muted shadow-md">
                <div className="relative size-32 overflow-hidden rounded-full">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={user.full_name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 text-3xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ) : (
            /* No active status — plain avatar */
            <div className="relative size-32 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={user.full_name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 text-3xl font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Info + Actions ────────────────────────────────── */}
      <div className="px-4 pb-4">
        {/* Row: name + action buttons */}
        <div className="flex items-start justify-between gap-2">
          {/* Name + verified */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-bold">{user.full_name}</h1>
              {profile.is_verified && (
                <BadgeCheck className="size-5 shrink-0 text-blue-500" aria-label="موثّق" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>

          {/* Buttons */}
          <div className="flex shrink-0 gap-2">
            {showMessageBtn && (
              <AuthGate
                isAuthenticated={isAuthenticated}
                action="message"
                redirectTo={`/profile/${user.username}`}
              >
                <Link href={`/messages/new?to=${user.username}`}>
                  <Button size="sm" variant="outline" className="min-h-10 gap-1.5">
                    <MessageCircle className="size-4" />
                    مراسلة
                  </Button>
                </Link>
              </AuthGate>
            )}
            {showFollowBtn && (
              <AuthGate
                isAuthenticated={isAuthenticated}
                action="follow"
                redirectTo={`/profile/${user.username}`}
              >
                <Button
                  size="sm"
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={onToggleFollow}
                  disabled={isPending}
                  className="min-h-10 min-w-20"
                >
                  {isPending ? '...' : isFollowing ? 'متابَع' : 'متابعة'}
                </Button>
              </AuthGate>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="mt-3 flex flex-wrap gap-2">
          {craft && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <Briefcase className="size-3" />
              {craft.name_ar}
            </span>
          )}
          {cityName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {cityName}
            </span>
          )}
          {profile.years_experience != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {profile.years_experience} سنة خبرة
            </span>
          )}
          {user.account_type === 'artisan' && (
            <RatingDisplay avgStars={avgRating} totalCount={totalRatingsCount} size="sm" />
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
        )}
      </div>
    </div>
  );
}
