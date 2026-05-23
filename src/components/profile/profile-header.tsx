'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Briefcase, Clock, MessageCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthGate } from '@/components/shared/auth-gate';
import { RatingDisplay } from '@/components/rating/rating-display';
import { PresenceText } from '@/components/shared/presence-text';
import { useIsOnline } from '@/hooks/use-is-online';
import { getCraftById } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';
import { useLang } from '@/lib/i18n/language-context';

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
  onAvatarClick?: () => void;
  onCoverClick?: () => void;
  onRatingClick?: () => void;
  lastSeenAt?: string | null;
  /** The owner's who_can_message policy: 'everyone' | 'followers'. */
  whoCanMessage?: string;
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
  onAvatarClick,
  onCoverClick,
  onRatingClick,
  lastSeenAt,
  whoCanMessage = 'everyone',
}: Props) {
  const { t } = useLang();
  const isOwnProfile = currentUser?.id === user.id;
  const isOnline = useIsOnline(user.id);

  const craft = profile.craft_category ? getCraftById(profile.craft_category) : null;
  const cityName = profile.city
    ? (CITIES.find((c) => c.id === profile.city)?.name_ar ?? profile.city)
    : null;

  // نُظهر الأزرار للزوار أيضاً — AuthGate يعترض النقر ويوجّه لتسجيل الدخول
  const showFollowBtn = !isOwnProfile;
  // "followers"-only messaging hides the button until the viewer follows the profile owner.
  const canMessage = whoCanMessage !== 'followers' || isFollowing;
  // Show message button for: (1) artisan profiles for anyone, (2) customer profiles only when visitor is also a customer
  const showMessageBtn =
    !isOwnProfile &&
    (user.account_type === 'artisan' ||
      (user.account_type === 'customer' && currentUser?.account_type === 'customer')) &&
    canMessage;

  const initials = user.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* ── Cover ─────────────────────────────────────────── */}
      <div className="relative h-44 w-full overflow-hidden sm:h-52"
        style={{ background: 'var(--brand-gradient)' }}>
        {profile.cover_url && (
          <button
            type="button"
            onClick={onCoverClick}
            className="absolute inset-0 w-full cursor-zoom-in focus-visible:outline-none"
            aria-label={t('viewCoverFullAriaLabel')}
          >
            <Image
              src={profile.cover_url}
              alt={t('coverPhotoAlt')}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </button>
        )}

        {/* Edit button — top-left (RTL) */}
        {isOwnProfile && (
          <div className="absolute start-3 top-3">
            <Link href="/profile/edit">
              <Button size="sm" variant="secondary" className="gap-1.5 opacity-90">
                <Pencil className="size-3.5" />
                {t('editProfileBtn')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Avatar overlap ────────────────────────────────── */}
      <div className="relative px-4">
        <div className="relative -mt-16 mb-3 inline-block">
          {hasActiveStatus && onViewStatus ? (
            /* Gradient ring — user has an active status */
            <button
              onClick={onViewStatus}
              aria-label={t('viewStatusAriaLabel')}
              className="rounded-full p-[3px] transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand-gradient)' }}
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
                    <div className="flex size-full items-center justify-center text-3xl font-bold text-white" style={{ background: 'var(--brand-gradient)' }}>
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ) : (
            /* No active status — clickable avatar (opens lightbox if photo exists) */
            <button
              type="button"
              onClick={profile.avatar_url ? onAvatarClick : undefined}
              aria-label={profile.avatar_url ? t('viewProfilePhotoAriaLabel') : undefined}
              className={`relative size-32 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${profile.avatar_url && onAvatarClick ? "cursor-zoom-in" : "cursor-default"}`}
            >
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
            </button>
          )}
          {isOnline && (
            <span
              aria-hidden="true"
              className="absolute bottom-3 end-3 size-6 rounded-full border-[3px] border-background bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.55)]"
            />
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
                <BadgeCheck className="size-5 shrink-0 text-blue-500 dark:text-blue-400" aria-label={t('verifiedBadgeAriaLabel')} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <PresenceText userId={user.id} lastSeenAt={lastSeenAt} className="mt-0.5 text-xs" />
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
                    {t('messageBtn')}
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
                  variant={isFollowing ? 'outline' : 'brand'}
                  onClick={onToggleFollow}
                  disabled={isPending}
                  className="min-h-10 min-w-20"
                >
                  {isPending ? '...' : isFollowing ? t('unfollow') : t('follow')}
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
              {profile.years_experience} {t('yearsExpSuffix')}
            </span>
          )}
          {user.account_type === 'artisan' && (
            <RatingDisplay
              avgStars={avgRating}
              totalCount={totalRatingsCount}
              size="sm"
              onClick={onRatingClick}
            />
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
