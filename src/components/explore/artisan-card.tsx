'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RatingDisplay } from '@/components/rating/rating-display';
import { useFollow } from '@/hooks/use-follow';
import { getCraftById } from '@/lib/constants/crafts';
import { CITIES } from '@/lib/constants/cities';
import type { ArtisanListItem } from '@/lib/queries/artisans';

type Props = {
  artisan: ArtisanListItem;
  currentUserId: string | null;
};

export function ArtisanCard({ artisan, currentUserId }: Props) {
  const { isFollowing, isPending, toggle } = useFollow(artisan.id, false);
  const craft = artisan.craft_category ? getCraftById(artisan.craft_category) : null;
  const cityName = artisan.city
    ? (CITIES.find((c) => c.id === artisan.city)?.name_ar ?? artisan.city)
    : null;

  const initials = artisan.full_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isOwnProfile = currentUserId === artisan.id;

  return (
    <Link
      href={`/profile/${artisan.username}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-muted">
          {artisan.avatar_url ? (
            <Image
              src={artisan.avatar_url}
              alt={artisan.full_name}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 text-lg font-bold text-white">
              {initials}
            </div>
          )}
        </div>

        {/* Name + username */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold leading-tight">{artisan.full_name}</span>
            {artisan.is_verified && (
              <BadgeCheck className="size-4 shrink-0 text-blue-500" aria-label="موثّق" />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">@{artisan.username}</p>
        </div>
      </div>

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {craft && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <Briefcase className="size-3" />
            {craft.name_ar}
          </span>
        )}
        {cityName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {cityName}
          </span>
        )}
        <RatingDisplay
          avgStars={artisan.avgRating}
          totalCount={artisan.totalRatingsCount}
          size="sm"
        />
      </div>

      {/* ── Follow button ────────────────────────────────────────────────── */}
      {currentUserId && !isOwnProfile && (
        <Button
          size="sm"
          variant={isFollowing ? 'outline' : 'default'}
          disabled={isPending}
          className="w-full min-h-9"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
        >
          {isPending ? '...' : isFollowing ? 'متابَع ✓' : 'متابعة'}
        </Button>
      )}
    </Link>
  );
}
