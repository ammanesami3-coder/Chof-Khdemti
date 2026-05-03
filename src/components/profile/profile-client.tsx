'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ProfileHeader } from './profile-header';
import { ProfileStats } from './profile-stats';
import { followUser, unfollowUser } from '@/lib/actions/follow';
import { StatusViewer } from '@/components/status/status-viewer';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StatusWithUser, StatusGroup } from '@/lib/actions/status';

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
  initialIsFollowing: boolean;
  postsCount: number;
  initialFollowersCount: number;
  followingCount: number;
  profileStatus: StatusWithUser | null;
};

export function ProfileClient({
  user,
  profile,
  avgRating,
  totalRatingsCount,
  currentUser,
  initialIsFollowing,
  postsCount,
  initialFollowersCount,
  followingCount,
  profileStatus,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isPending, startTransition] = useTransition();
  const [statusOpen, setStatusOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<StatusWithUser | null>(profileStatus);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  const [coverLightboxOpen, setCoverLightboxOpen] = useState(false);
  const [avatarChoiceOpen, setAvatarChoiceOpen] = useState(false);

  function toggleFollow() {
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((c) => c + (wasFollowing ? -1 : 1));

    startTransition(async () => {
      const result = wasFollowing
        ? await unfollowUser(user.id)
        : await followUser(user.id);

      if (result.error) {
        setIsFollowing(wasFollowing);
        setFollowersCount((c) => c + (wasFollowing ? 1 : -1));
        toast.error(result.error);
      }
    });
  }

  // When the avatar ring is tapped:
  // — if photo exists → offer a choice (status vs. photo)
  // — if no photo     → open status directly
  function handleAvatarAreaClick() {
    if (profile.avatar_url) {
      setAvatarChoiceOpen(true);
    } else {
      setStatusOpen(true);
    }
  }

  // Click on the rating badge → activate ratings tab + scroll to it
  function handleRatingClick() {
    const trigger = document.getElementById('profile-ratings-tab') as HTMLElement | null;
    if (!trigger) return;
    trigger.click();
    // Small delay lets Radix swap the active panel before scrolling
    setTimeout(() => {
      document.getElementById('profile-tabs')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  return (
    <>
      <ProfileHeader
        user={user}
        profile={profile}
        avgRating={avgRating}
        totalRatingsCount={totalRatingsCount}
        currentUser={currentUser}
        isAuthenticated={!!currentUser}
        isFollowing={isFollowing}
        isPending={isPending}
        onToggleFollow={toggleFollow}
        hasActiveStatus={!!localStatus}
        onViewStatus={localStatus ? handleAvatarAreaClick : undefined}
        onAvatarClick={profile.avatar_url ? () => setAvatarLightboxOpen(true) : undefined}
        onCoverClick={profile.cover_url ? () => setCoverLightboxOpen(true) : undefined}
        onRatingClick={totalRatingsCount > 0 ? handleRatingClick : undefined}
      />
      <ProfileStats
        postsCount={postsCount}
        followersCount={followersCount}
        followingCount={followingCount}
      />

      {localStatus && (() => {
        const group: StatusGroup = {
          user: localStatus.user,
          statuses: [localStatus],
          hasUnviewed: !localStatus.viewed,
        };
        return (
          <StatusViewer
            open={statusOpen}
            onOpenChange={setStatusOpen}
            groups={[group]}
            initialGroupIdx={0}
            currentUserId={currentUser?.id ?? ''}
            onViewed={(id) =>
              setLocalStatus((s) => (s?.id === id ? { ...s, viewed: true } : s))
            }
            onDeleted={() => {
              setLocalStatus(null);
              setStatusOpen(false);
            }}
          />
        );
      })()}

      {/* ── Avatar-choice dialog (shown when both status + photo exist) ──── */}
      <Dialog open={avatarChoiceOpen} onOpenChange={setAvatarChoiceOpen}>
        <DialogContent className="max-w-[280px] overflow-hidden rounded-2xl p-0 [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">اختر ما تريد مشاهدته</DialogTitle>

          {/* wrapper div keeps our buttons out of [&>button] scope */}
          <div className="flex flex-col">
            {/* Option 1: view status */}
            <button
              type="button"
              onClick={() => { setAvatarChoiceOpen(false); setStatusOpen(true); }}
              className="flex w-full items-center gap-3 border-b px-4 py-4 text-start transition-colors hover:bg-muted/60"
            >
              <span className="inline-flex shrink-0 rounded-full bg-gradient-to-tr from-red-600 via-orange-400 to-green-500 p-[2px]">
                <span className="block overflow-hidden rounded-full border-2 border-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.avatar_url!} alt="" className="size-9 object-cover" />
                </span>
              </span>
              <span className="text-sm font-medium">مشاهدة الحالة</span>
            </button>

            {/* Option 2: view profile photo */}
            <button
              type="button"
              onClick={() => { setAvatarChoiceOpen(false); setAvatarLightboxOpen(true); }}
              className="flex w-full items-center gap-3 px-4 py-4 text-start transition-colors hover:bg-muted/60"
            >
              <span className="inline-flex size-9 shrink-0 overflow-hidden rounded-full border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.avatar_url!} alt="" className="size-full object-cover" />
              </span>
              <span className="text-sm font-medium">صورة الملف الشخصي</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightboxes ──────────────────────────────────── */}
      {profile.avatar_url && (
        <ImageLightbox
          src={profile.avatar_url}
          alt={user.full_name}
          open={avatarLightboxOpen}
          onClose={() => setAvatarLightboxOpen(false)}
          allowDownload
        />
      )}
      {profile.cover_url && (
        <ImageLightbox
          src={profile.cover_url}
          alt="غلاف الملف الشخصي"
          open={coverLightboxOpen}
          onClose={() => setCoverLightboxOpen(false)}
          allowDownload
        />
      )}
    </>
  );
}
