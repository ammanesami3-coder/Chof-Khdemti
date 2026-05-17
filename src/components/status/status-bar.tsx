'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { StatusComposer } from './status-composer';
import { StatusViewer } from './status-viewer';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n/language-context';
import type { StatusGroup, StatusWithUser } from '@/lib/types/status.types';

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

  // Viewer always starts with own group first
  const orderedGroups: StatusGroup[] = ownGroup
    ? [ownGroup, ...otherGroups]
    : otherGroups;

  function openViewerForGroup(userId: string) {
    const idx = orderedGroups.findIndex((g) => g.user.id === userId);
    setViewerGroupIdx(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }

  // Listen for story shares coming from post cards (cross-component)
  useEffect(() => {
    function onStoryCreated(e: Event) {
      handleStatusCreated((e as CustomEvent<StatusWithUser>).detail);
    }
    window.addEventListener('status:story-created', onStoryCreated);
    return () => window.removeEventListener('status:story-created', onStoryCreated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        hasUnviewed: g.statuses.some((s) => !s.viewed && s.id !== statusId),
      })),
    );
  }

  return (
    <>
      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
        dir="rtl"
      >
        {/* ── Create Story card — ALWAYS first ─────────────────────────── */}
        <CreateStoryCard
          currentUser={currentUser}
          onClick={() => setComposerOpen(true)}
        />

        {/* ── Own story card — appears only when user has stories ───────── */}
        {ownGroup && (
          <StoryCard
            group={ownGroup}
            isOwn
            onClick={() => openViewerForGroup(currentUser.id)}
          />
        )}

        {/* ── Other users' story cards ──────────────────────────────────── */}
        {otherGroups.map((group) => (
          <StoryCard
            key={group.user.id}
            group={group}
            onClick={() => openViewerForGroup(group.user.id)}
          />
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

// ── CreateStoryCard ───────────────────────────────────────────────────────────

function CreateStoryCard({
  currentUser,
  onClick,
}: {
  currentUser: { username: string; full_name: string; avatar_url: string | null };
  onClick: () => void;
}) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('createStory')}
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-xl',
        'border border-border bg-card shadow-sm',
        'transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
      style={{ width: 108, height: 151 }}
    >
      {/* Top section: avatar as background */}
      <div className="relative overflow-hidden bg-muted" style={{ height: 107 }}>
        {currentUser.avatar_url ? (
          <Image
            src={currentUser.avatar_url}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="108px"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
        )}
      </div>

      {/* Plus badge — straddles the photo/label boundary */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 flex size-9 items-center justify-center rounded-full bg-primary shadow-lg ring-[3px] ring-card" style={{ top: 89 }}>
        <Plus className="size-5 text-primary-foreground" strokeWidth={2.5} />
      </div>

      {/* Bottom section: label */}
      <div className="flex h-[44px] flex-col items-center justify-end pb-2.5 pt-5 bg-card">
        <span className="text-center text-[11.5px] font-semibold text-foreground leading-tight">
          {t('createStory')}
        </span>
      </div>
    </button>
  );
}

// ── StoryCard ─────────────────────────────────────────────────────────────────

function StoryCard({
  group,
  isOwn = false,
  onClick,
}: {
  group: StatusGroup;
  isOwn?: boolean;
  onClick: () => void;
}) {
  const { t } = useLang();
  const story = group.statuses[0]!;
  const { user, hasUnviewed } = group;
  const hasRing = isOwn || hasUnviewed;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOwn ? t('myStoryLabel') : `${t('storyOfPrefix')} ${user.full_name}`}
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-xl shadow-sm',
        'transition-transform duration-150 hover:scale-[1.02] active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
      style={{ width: 108, height: 151 }}
    >
      {/* ── Story background ─── */}
      {story.content_type === 'text' ? (
        <div
          className="h-full w-full flex items-center justify-center p-3"
          style={{ background: story.background_color }}
        >
          <p
            className="line-clamp-5 text-center text-[11px] font-semibold leading-snug"
            style={{
              color: story.text_color,
              fontFamily: fontFamilyFromStyle(story.font_style),
            }}
          >
            {story.content}
          </p>
        </div>
      ) : (
        <>
          {(story.thumbnail_url ?? story.media_url) && (
            <Image
              src={story.thumbnail_url ?? story.media_url ?? ''}
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="108px"
            />
          )}
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        </>
      )}

      {/* ── Avatar with ring at top-start ─── */}
      <div className="absolute top-2.5 start-2.5 z-10">
        <div
          className="rounded-full p-[2.5px] shadow-md"
          style={hasRing ? { background: 'var(--brand-gradient)' } : { background: 'rgba(255,255,255,0.4)' }}
        >
          <div className="rounded-full overflow-hidden ring-[2px] ring-card">
            <UserAvatar user={user} size="sm" linkable={false} />
          </div>
        </div>
      </div>

      {/* ── Name at bottom ─── */}
      <div className="absolute bottom-0 inset-x-0 px-2.5 pb-3 z-10">
        <p className="truncate text-start text-[11.5px] font-semibold text-white drop-shadow-md leading-tight">
          {isOwn ? t('myStoryLabel') : user.full_name}
        </p>
      </div>

      {/* ── Unviewed border ring ─── */}
      {hasRing && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-[2.5px] ring-inset ring-[#FF9F43]/60" />
      )}
    </button>
  );
}

function fontFamilyFromStyle(style: string): string {
  switch (style) {
    case 'serif': return 'Georgia, serif';
    case 'mono':  return 'monospace';
    default:      return 'inherit';
  }
}
