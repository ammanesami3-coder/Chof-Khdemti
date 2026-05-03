'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getActiveStatusForUser } from '@/lib/actions/status';
import type { AvatarSize } from './user-avatar';
import type { StatusGroup } from '@/lib/actions/status';

const StatusViewerLazy = dynamic(
  () => import('@/components/status/status-viewer').then((m) => m.StatusViewer),
  { ssr: false },
);

// ── Constants (mirrored from UserAvatar) ──────────────────────────────────────

const DIM: Record<AvatarSize, string> = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-14',
  xl: 'size-20',
};

const FONT: Record<AvatarSize, string> = {
  xs: 'text-[9px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-xl',
};

const PX: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

const RING_PAD: Record<AvatarSize, string> = {
  xs: 'p-[1.5px]',
  sm: 'p-[2px]',
  md: 'p-[2px]',
  lg: 'p-[2.5px]',
  xl: 'p-[3px]',
};

const RING_BORDER: Record<AvatarSize, string> = {
  xs: 'border',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
  xl: 'border-[3px]',
};

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
  size?: AvatarSize;
  className?: string;
  currentUserId?: string;
}

export function StatusAwareAvatar({
  user,
  size = 'md',
  className,
  currentUserId = '',
}: Props) {
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: statusGroup } = useQuery({
    queryKey: ['user-status', user.id],
    queryFn: () => getActiveStatusForUser(user.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const hasStatus = !!statusGroup && statusGroup.statuses.length > 0;
  // derived directly from cache so every instance reacts to cache updates
  const hasUnviewed = hasStatus && statusGroup.hasUnviewed;

  // When a specific status is viewed, mark it in the React Query cache.
  // All other StatusAwareAvatar instances for the same user immediately
  // reflect the grey ring because they share the same query cache entry.
  const handleViewed = useCallback(
    (statusId: string) => {
      queryClient.setQueryData<StatusGroup | null>(
        ['user-status', user.id],
        (old) => {
          if (!old) return old;
          const updated = old.statuses.map((s) =>
            s.id === statusId ? { ...s, viewed: true } : s,
          );
          return {
            ...old,
            statuses: updated,
            hasUnviewed: updated.some((s) => !s.viewed),
          };
        },
      );
    },
    [user.id, queryClient],
  );

  const dim = DIM[size];
  const font = FONT[size];
  const px = PX[size];

  const avatarInner = (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full select-none',
        dim,
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
            'flex size-full items-center justify-center bg-gradient-to-br from-red-500 to-green-600 font-semibold text-white',
            font,
          )}
        >
          {initials(user.full_name)}
        </span>
      )}
    </span>
  );

  if (hasStatus) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label={`مشاهدة حالة ${user.full_name}`}
          className={cn(
            'inline-flex shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            hasUnviewed
              ? 'bg-gradient-to-tr from-red-600 via-orange-400 to-green-500'
              : 'bg-muted',
            RING_PAD[size],
            className,
          )}
        >
          <span
            className={cn(
              'block rounded-full border-background bg-background',
              RING_BORDER[size],
            )}
          >
            {avatarInner}
          </span>
        </button>

        {viewerOpen && (
          <StatusViewerLazy
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            groups={[statusGroup]}
            initialGroupIdx={0}
            currentUserId={currentUserId}
            onViewed={handleViewed}
            onDeleted={() => {
              setViewerOpen(false);
              queryClient.setQueryData(['user-status', user.id], null);
            }}
          />
        )}
      </>
    );
  }

  // No active status — plain link to profile
  return (
    <Link
      href={`/profile/${user.username}`}
      aria-label={`زيارة ملف ${user.full_name}`}
      className={cn(
        'inline-flex shrink-0 rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {avatarInner}
    </Link>
  );
}
