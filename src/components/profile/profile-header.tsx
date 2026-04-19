'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, MapPin, Briefcase, Clock, Star, MessageCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/use-follow';
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
  currentUser: CurrentUser;
  initialIsFollowing: boolean;
};

export function ProfileHeader({
  user,
  profile,
  avgRating,
  currentUser,
  initialIsFollowing,
}: Props) {
  const isOwnProfile = currentUser?.id === user.id;
  const { isFollowing, isPending, toggle } = useFollow(user.id, initialIsFollowing);

  const craft = profile.craft_category ? getCraftById(profile.craft_category) : null;
  const cityName = profile.city
    ? (CITIES.find((c) => c.id === profile.city)?.name_ar ?? profile.city)
    : null;

  const showFollowBtn = !!currentUser && !isOwnProfile;
  const showMessageBtn =
    !!currentUser &&
    !isOwnProfile &&
    currentUser.account_type !== user.account_type;

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
              <Link href={`/messages?to=${user.username}`}>
                <Button size="sm" variant="outline" className="min-h-10 gap-1.5">
                  <MessageCircle className="size-4" />
                  رسالة
                </Button>
              </Link>
            )}
            {showFollowBtn && (
              <Button
                size="sm"
                variant={isFollowing ? 'outline' : 'default'}
                onClick={toggle}
                disabled={isPending}
                className="min-h-10 min-w-20"
              >
                {isPending ? '...' : isFollowing ? 'متابَع' : 'متابعة'}
              </Button>
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
          {avgRating != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Star className="size-3 fill-current" />
              {avgRating.toFixed(1)}
            </span>
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
