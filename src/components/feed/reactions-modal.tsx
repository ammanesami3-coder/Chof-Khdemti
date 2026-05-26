'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import { REACTIONS, getReaction } from '@/lib/constants/reactions';
import { getPostReactions, getCommentReactions, type ReactorUser } from '@/lib/actions/likes';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';

interface ReactionsModalProps {
  open: boolean;
  onClose: () => void;
  type: 'post' | 'comment';
  entityId: string;
}

export function ReactionsModal({ open, onClose, type, entityId }: ReactionsModalProps) {
  const { t } = useLang();
  const [reactors, setReactors] = useState<ReactorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  const loadReactions = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const fn = type === 'post' ? getPostReactions : getCommentReactions;
      const data = await fn(entityId);
      setReactors(data);
    } finally {
      setLoading(false);
    }
  }, [entityId, type]);

  useEffect(() => {
    if (open) {
      setActiveTab('all');
      loadReactions();
    } else {
      setReactors([]);
    }
  }, [open, loadReactions]);

  // Group by reaction type
  const grouped = reactors.reduce<Record<string, ReactorUser[]>>((acc, r) => {
    if (!acc[r.reaction]) acc[r.reaction] = [];
    acc[r.reaction]!.push(r);
    return acc;
  }, {});

  const tabs = [
    { key: 'all', emoji: null as string | null, label: t('allReactions'), count: reactors.length },
    ...REACTIONS
      .filter((r) => (grouped[r.type]?.length ?? 0) > 0)
      .map((r) => ({
        key: r.type,
        emoji: r.emoji,
        label: r.label_ar,
        count: grouped[r.type]?.length ?? 0,
      })),
  ];

  const displayed = activeTab === 'all' ? reactors : (grouped[activeTab] ?? []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pb-2 pt-4">
          <DialogTitle className="text-base font-semibold">{t('reactionsModalTitle')}</DialogTitle>
        </DialogHeader>

        {/* Tabs — flow respects page direction (RTL/LTR) */}
        <div className="flex items-center gap-0.5 overflow-x-auto border-b px-2 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.emoji ? (
                <span className="text-base leading-none">{tab.emoji}</span>
              ) : (
                <span>{tab.label}</span>
              )}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* User list */}
        <div className="max-h-[60vh] min-h-[100px] overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              {t('loading')}
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t('noReactions')}
            </div>
          ) : (
            displayed.map((reactor) => {
              const reactionDef = getReaction(reactor.reaction);
              return (
                <Link
                  key={reactor.user_id}
                  href={`/profile/${reactor.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      user={{
                        username: reactor.username,
                        full_name: reactor.full_name,
                        avatar_url: reactor.avatar_url,
                      }}
                      size="sm"
                      linkable={false}
                    />
                    <span className="absolute -bottom-0.5 -end-0.5 flex size-[18px] items-center justify-center rounded-full border-2 border-background bg-background text-[11px] leading-none">
                      {reactionDef?.emoji ?? '👍'}
                    </span>
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{reactor.full_name}</span>
                </Link>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
