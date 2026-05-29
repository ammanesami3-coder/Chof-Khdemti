'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { SubscribedBadge } from '@/components/shared/subscribed-badge';
import { getFollowList, followUser, unfollowUser, type FollowListUser } from '@/lib/actions/follow';
import { followStore } from '@/lib/stores/follow-store';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

type Tab = 'followers' | 'following';

interface FollowListModalProps {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  /** Which list to show first */
  initialTab: Tab;
  /** Viewer is signed in (controls whether follow buttons render) */
  isAuthenticated: boolean;
  currentUserId?: string;
}

export function FollowListModal({
  open,
  onClose,
  ownerId,
  initialTab,
  isAuthenticated,
  currentUserId,
}: FollowListModalProps) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [users, setUsers] = useState<FollowListUser[]>([]);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setRestricted(false);
    getFollowList(ownerId, tab)
      .then((res) => {
        if (cancelled) return;
        if (res.restricted) {
          setRestricted(true);
          setUsers([]);
        } else {
          setUsers(res.users);
        }
      })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, tab, ownerId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pb-0 pt-4">
          <DialogTitle className="sr-only">
            {tab === 'followers' ? t('followers') : t('following')}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center border-b px-2">
          {(['followers', 'following'] as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 rounded-t-lg py-2.5 text-sm font-semibold transition-colors',
                tab === key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {key === 'followers' ? t('followers') : t('following')}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-[60vh] min-h-[160px] overflow-y-auto py-1">
          {loading ? (
            <div className="py-1" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : restricted ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Lock className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">{t('followListPrivateTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('followListPrivateDesc')}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {tab === 'followers' ? t('noFollowersYet') : t('noFollowingYet')}
            </div>
          ) : (
            users.map((u) => (
              <FollowRow
                key={u.id}
                user={u}
                onNavigate={onClose}
                isAuthenticated={isAuthenticated}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowRow({
  user,
  onNavigate,
  isAuthenticated,
  currentUserId,
}: {
  user: FollowListUser;
  onNavigate: () => void;
  isAuthenticated: boolean;
  currentUserId?: string;
}) {
  const { t } = useLang();
  const [isPending, startTransition] = useTransition();

  // Module-level store keeps the button state in sync with the rest of the app.
  const followMap = useSyncExternalStore(followStore.subscribe, followStore.getSnapshot);
  const isFollowing = followMap.has(user.id)
    ? (followMap.get(user.id) as boolean)
    : user.is_following;

  function toggle() {
    if (isPending) return;
    const prev = isFollowing;
    followStore.setFollowing(user.id, !prev);
    startTransition(async () => {
      const res = prev ? await unfollowUser(user.id) : await followUser(user.id);
      if (res.error) {
        followStore.setFollowing(user.id, prev);
        toast.error(res.error);
      }
    });
  }

  const showButton = isAuthenticated && user.id !== currentUserId;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
      <Link href={`/profile/${user.username}`} onClick={onNavigate} className="shrink-0">
        <UserAvatar
          user={{ username: user.username, full_name: user.full_name, avatar_url: user.avatar_url }}
          size="md"
          linkable={false}
          userId={user.id}
        />
      </Link>
      <Link
        href={`/profile/${user.username}`}
        onClick={onNavigate}
        className="min-w-0 flex-1"
      >
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold">{user.full_name}</span>
          {user.is_subscribed && <SubscribedBadge size="xs" />}
        </span>
        <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
      </Link>
      {showButton && (
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
            isFollowing
              ? 'border border-border text-foreground hover:bg-muted'
              : 'text-white',
          )}
          style={isFollowing ? undefined : { background: 'var(--brand-gradient)' }}
        >
          {isFollowing ? t('following_verb') : t('follow')}
        </button>
      )}
    </div>
  );
}
