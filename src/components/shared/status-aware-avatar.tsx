'use client';

/**
 * StatusAwareAvatar — a UserAvatar with the story/status gradient ring.
 *
 * The avatar itself (circular clip + online dot) is delegated entirely to
 * <UserAvatar> so there is exactly one avatar implementation in the codebase.
 * This component only adds: the status gradient ring + the status viewer.
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { getActiveStatusForUser } from '@/lib/actions/status';
import { useLang } from '@/lib/i18n/language-context';
import { UserAvatar, type AvatarSize } from './user-avatar';
import type { StatusGroup } from '@/lib/types/status.types';

const StatusViewerLazy = dynamic(
  () => import('@/components/status/status-viewer').then((m) => m.StatusViewer),
  { ssr: false },
);

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
  const { t } = useLang();
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
  const hasUnviewed = hasStatus && statusGroup.hasUnviewed;

  // When a status is viewed, reflect it in the shared query cache so every
  // StatusAwareAvatar for the same user immediately shows the grey ring.
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

  // No active status — plain UserAvatar (handles its own profile link + dot).
  if (!hasStatus) {
    return <UserAvatar user={user} size={size} className={className} />;
  }

  // Has active status — wrap UserAvatar in the gradient story ring.
  return (
    <>
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        aria-label={`${t('viewStatusOfPrefix')} ${user.full_name}`}
        className={cn(
          'inline-flex shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !hasUnviewed && 'bg-muted',
          RING_PAD[size],
          className,
        )}
        style={hasUnviewed ? { background: 'var(--brand-gradient)' } : undefined}
      >
        <span
          className={cn(
            'block rounded-full border-background bg-background',
            RING_BORDER[size],
          )}
        >
          <UserAvatar user={user} size={size} linkable={false} />
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
