'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ProfileHeader } from './profile-header';
import { ProfileStats } from './profile-stats';
import { followUser, unfollowUser } from '@/lib/actions/follow';
import { StatusViewer } from '@/components/status/status-viewer';
import type { StatusWithUser } from '@/lib/actions/status';

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
        onViewStatus={localStatus ? () => setStatusOpen(true) : undefined}
      />
      <ProfileStats
        postsCount={postsCount}
        followersCount={followersCount}
        followingCount={followingCount}
      />

      {localStatus && (
        <StatusViewer
          open={statusOpen}
          onOpenChange={setStatusOpen}
          statuses={[localStatus]}
          initialIndex={0}
          currentUserId={currentUser?.id ?? ''}
          onViewed={(id) =>
            setLocalStatus((s) => (s?.id === id ? { ...s, viewed: true } : s))
          }
          onDeleted={() => {
            setLocalStatus(null);
            setStatusOpen(false);
          }}
        />
      )}
    </>
  );
}
