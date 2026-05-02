'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { StatusComposer } from './status-composer';
import { StatusViewer } from './status-viewer';
import type { StatusWithUser } from '@/lib/actions/status';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser;
  initialStatuses: StatusWithUser[];
};

export function StatusBar({ currentUser, initialStatuses }: Props) {
  const [statuses, setStatuses] = useState<StatusWithUser[]>(initialStatuses);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const ownStatus = statuses.find((s) => s.user_id === currentUser.id) ?? null;
  const otherStatuses = statuses.filter((s) => s.user_id !== currentUser.id);
  // Order: own first, then others (unviewed first)
  const orderedStatuses: StatusWithUser[] = [
    ...(ownStatus ? [ownStatus] : []),
    ...otherStatuses.filter((s) => !s.viewed),
    ...otherStatuses.filter((s) => s.viewed),
  ];

  function openViewer(statusId: string) {
    const idx = orderedStatuses.findIndex((s) => s.id === statusId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }

  function handleAddClick() {
    if (ownStatus) {
      openViewer(ownStatus.id);
    } else {
      setComposerOpen(true);
    }
  }

  function handleStatusCreated(newStatus: StatusWithUser) {
    // Replace own status if exists, otherwise prepend
    setStatuses((prev) => [
      newStatus,
      ...prev.filter((s) => s.user_id !== currentUser.id),
    ]);
  }

  function handleStatusDeleted(statusId: string) {
    setStatuses((prev) => prev.filter((s) => s.id !== statusId));
  }

  function handleViewed(statusId: string) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === statusId ? { ...s, viewed: true } : s)),
    );
  }

  return (
    <>
      {/* ── Scrollable status strip ──────────────────────────────── */}
      <div
        className="mb-4 flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
        dir="rtl"
      >
        {/* ── "Add / Own status" slot ─── */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            onClick={handleAddClick}
            className="relative rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={ownStatus ? 'حالتك' : 'أضف حالة'}
          >
            {ownStatus ? (
              /* Own status with gradient ring */
              <GradientRing viewed={false}>
                <UserAvatar
                  user={{
                    username: currentUser.username,
                    full_name: currentUser.full_name,
                    avatar_url: currentUser.avatar_url,
                  }}
                  size="lg"
                  linkable={false}
                />
              </GradientRing>
            ) : (
              /* No status — plain avatar + "+" badge */
              <span className="relative inline-flex">
                <span className="block size-14 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30">
                  <UserAvatar
                    user={{
                      username: currentUser.username,
                      full_name: currentUser.full_name,
                      avatar_url: currentUser.avatar_url,
                    }}
                    size="lg"
                    linkable={false}
                  />
                </span>
                <span className="absolute bottom-0 end-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Plus className="size-3" strokeWidth={3} />
                </span>
              </span>
            )}
          </button>
          <span className="max-w-[56px] truncate text-center text-[10px] text-muted-foreground">
            {ownStatus ? 'حالتك' : 'إضافة'}
          </span>
        </div>

        {/* ── Others' statuses ─── */}
        {orderedStatuses
          .filter((s) => s.user_id !== currentUser.id)
          .map((status) => (
            <div key={status.id} className="flex shrink-0 flex-col items-center gap-1">
              <button
                onClick={() => openViewer(status.id)}
                className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`حالة ${status.user.full_name}`}
              >
                {status.viewed ? (
                  <ViewedRing>
                    <UserAvatar user={status.user} size="lg" linkable={false} />
                  </ViewedRing>
                ) : (
                  <GradientRing viewed={false}>
                    <UserAvatar user={status.user} size="lg" linkable={false} />
                  </GradientRing>
                )}
              </button>
              <span className="max-w-[56px] truncate text-center text-[10px] text-muted-foreground">
                {status.user.username}
              </span>
            </div>
          ))}
      </div>

      <StatusComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreated={handleStatusCreated}
      />

      {orderedStatuses.length > 0 && (
        <StatusViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          statuses={orderedStatuses}
          initialIndex={viewerIndex}
          currentUserId={currentUser.id}
          onViewed={handleViewed}
          onDeleted={handleStatusDeleted}
        />
      )}
    </>
  );
}

// ── Gradient ring (unviewed) ──────────────────────────────────────────────
function GradientRing({ children }: { children: React.ReactNode; viewed: boolean }) {
  return (
    <span className="block rounded-full bg-gradient-to-tr from-red-600 via-orange-400 to-green-500 p-[2.5px]">
      <span className="block rounded-full bg-background p-[2px]">{children}</span>
    </span>
  );
}

// ── Viewed ring (gray) ────────────────────────────────────────────────────
function ViewedRing({ children }: { children: React.ReactNode }) {
  return (
    <span className="block rounded-full border-2 border-muted-foreground/30 p-[2px]">
      {children}
    </span>
  );
}
