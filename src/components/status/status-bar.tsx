'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { StatusComposer } from './status-composer';
import { StatusViewer } from './status-viewer';
import type { StatusGroup, StatusWithUser } from '@/lib/actions/status';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser;
  initialGroups: StatusGroup[];
};

export function StatusBar({ currentUser, initialGroups }: Props) {
  const [groups, setGroups] = useState<StatusGroup[]>(initialGroups);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);

  const ownGroup = groups.find((g) => g.user.id === currentUser.id) ?? null;
  const otherGroups = groups.filter((g) => g.user.id !== currentUser.id);

  // All groups ordered: own first
  const orderedGroups: StatusGroup[] = ownGroup
    ? [ownGroup, ...otherGroups]
    : otherGroups;

  function openViewerForGroup(userId: string) {
    const idx = orderedGroups.findIndex((g) => g.user.id === userId);
    setViewerGroupIdx(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }

  function handleOwnClick() {
    if (ownGroup) {
      openViewerForGroup(currentUser.id);
    } else {
      setComposerOpen(true);
    }
  }

  function handleStatusCreated(newStatus: StatusWithUser) {
    setGroups((prev) => {
      const withoutOwn = prev.filter((g) => g.user.id !== currentUser.id);
      const ownExisting = prev.find((g) => g.user.id === currentUser.id);
      const newOwnGroup: StatusGroup = {
        user: newStatus.user,
        statuses: [newStatus, ...(ownExisting?.statuses ?? [])],
        hasUnviewed: false,
      };
      return [newOwnGroup, ...withoutOwn];
    });
  }

  function handleStatusDeleted(statusId: string) {
    setGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          statuses: g.statuses.filter((s) => s.id !== statusId),
        }))
        .filter((g) => g.statuses.length > 0),
    );
  }

  function handleViewed(statusId: string) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        statuses: g.statuses.map((s) =>
          s.id === statusId ? { ...s, viewed: true } : s,
        ),
        hasUnviewed: g.statuses.some(
          (s) => !s.viewed && s.id !== statusId,
        ),
      })),
    );
  }

  return (
    <>
      {/* ── Scrollable story strip ─────────────────────────────── */}
      <div
        className="mb-4 flex gap-2.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
        dir="rtl"
      >
        {/* ── Create / Own Story card ─────────────── */}
        <button
          onClick={handleOwnClick}
          className="relative shrink-0 overflow-hidden rounded-2xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ width: 110, height: 196 }}
          aria-label={ownGroup ? 'حالاتي' : 'إضافة حالة'}
        >
          {ownGroup ? (
            /* Has own stories — show latest as card */
            <StoryCardContent story={ownGroup.statuses[0]!} isOwn />
          ) : (
            /* No own stories — create card */
            <div className="flex h-full w-full flex-col items-center justify-end bg-muted pb-3">
              <div className="relative mb-auto mt-4">
                <UserAvatar
                  user={{
                    username: currentUser.username,
                    full_name: currentUser.full_name,
                    avatar_url: currentUser.avatar_url,
                  }}
                  size="xl"
                  linkable={false}
                />
                <span className="absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Plus className="size-4" strokeWidth={2.5} />
                </span>
              </div>
              <span className="mt-auto text-[11px] font-medium text-foreground">
                إضافة حالة
              </span>
            </div>
          )}
        </button>

        {/* ── Other users' story cards ────────────── */}
        {otherGroups.map((group) => (
          <button
            key={group.user.id}
            onClick={() => openViewerForGroup(group.user.id)}
            className="relative shrink-0 overflow-hidden rounded-2xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ width: 110, height: 196 }}
            aria-label={`حالة ${group.user.full_name}`}
          >
            <StoryCardContent story={group.statuses[0]!} />

            {/* Ring indicator */}
            <div
              className={[
                'pointer-events-none absolute inset-0 rounded-2xl',
                group.hasUnviewed
                  ? 'ring-[3px] ring-inset ring-gradient-to-tr ring-green-500'
                  : 'ring-2 ring-inset ring-white/30',
              ].join(' ')}
            />

            {/* Avatar + username overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-2">
              {/* Avatar at top */}
              <AvatarWithRing
                user={group.user}
                hasUnviewed={group.hasUnviewed}
              />
              {/* Username at bottom */}
              <p className="truncate text-start text-[11px] font-semibold text-white drop-shadow">
                {group.user.username}
              </p>
            </div>
          </button>
        ))}
      </div>

      <StatusComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreated={handleStatusCreated}
      />

      {orderedGroups.length > 0 && (
        <StatusViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          groups={orderedGroups}
          initialGroupIdx={viewerGroupIdx}
          currentUserId={currentUser.id}
          onViewed={handleViewed}
          onDeleted={handleStatusDeleted}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StoryCardContent({
  story,
  isOwn = false,
}: {
  story: StatusWithUser;
  isOwn?: boolean;
}) {
  if (story.content_type === 'text') {
    return (
      <div
        className="flex h-full w-full items-center justify-center p-2"
        style={{ background: story.background_color }}
      >
        <p
          className="line-clamp-4 text-center text-sm font-semibold leading-snug"
          style={{ color: story.text_color, fontFamily: fontFamilyFromStyle(story.font_style) }}
        >
          {story.content}
        </p>
        {isOwn && (
          <div className="absolute inset-0 flex flex-col justify-between p-2">
            <span className="text-start text-[10px] font-medium text-white/80 drop-shadow">
              حالتي
            </span>
          </div>
        )}
      </div>
    );
  }

  const imgSrc = story.thumbnail_url ?? story.media_url ?? '';

  return (
    <>
      {imgSrc && (
        <Image
          src={imgSrc}
          alt=""
          fill
          className="object-cover"
          sizes="110px"
        />
      )}
      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
    </>
  );
}

function AvatarWithRing({
  user,
  hasUnviewed,
}: {
  user: { id: string; username: string; full_name: string; avatar_url: string | null };
  hasUnviewed: boolean;
}) {
  return hasUnviewed ? (
    <span className="block rounded-full bg-gradient-to-tr from-red-600 via-orange-400 to-green-500 p-[2px] shadow">
      <span className="block rounded-full bg-black/20 p-[1.5px]">
        <UserAvatar user={user} size="sm" linkable={false} />
      </span>
    </span>
  ) : (
    <span className="block rounded-full border-2 border-white/60 p-[1.5px] shadow">
      <UserAvatar user={user} size="sm" linkable={false} />
    </span>
  );
}

function fontFamilyFromStyle(style: string): string {
  switch (style) {
    case 'serif': return 'Georgia, serif';
    case 'mono':  return 'monospace';
    default:      return 'inherit';
  }
}
