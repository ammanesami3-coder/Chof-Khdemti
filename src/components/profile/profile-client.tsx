'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ProfileHeader } from './profile-header';
import { ProfileStats } from './profile-stats';
import { followUser, unfollowUser } from '@/lib/actions/follow';

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
  postsCount: number;
  initialFollowersCount: number;
  followingCount: number;
};

export function ProfileClient({
  user,
  profile,
  avgRating,
  currentUser,
  initialIsFollowing,
  postsCount,
  initialFollowersCount,
  followingCount,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isPending, startTransition] = useTransition();

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
        currentUser={currentUser}
        isFollowing={isFollowing}
        isPending={isPending}
        onToggleFollow={toggleFollow}
      />
      <ProfileStats
        postsCount={postsCount}
        followersCount={followersCount}
        followingCount={followingCount}
      />
    </>
  );
}
