'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ArrowRight, Loader2, MessageCircle, Search, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getShareableUsers, sharePostViaMessage, type ShareableUser } from '@/lib/actions/shares';
import { useLang } from '@/lib/i18n/language-context';
import type { PostWithAuthor } from '@/lib/validations/post';

type Props = {
  post: PostWithAuthor;
  onBack: () => void;
  onClose: () => void;
};

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-primary-foreground">
      {initials}
    </div>
  );
}

export function SendViaMessageSheet({ post, onBack, onClose }: Props) {
  const { t, dir } = useLang();
  const [users, setUsers] = useState<ShareableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getShareableUsers().then((data) => {
      setUsers(data);
      setLoadingUsers(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [users, search]);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSend() {
    if (!selected.size) return;
    setSending(true);
    const result = await sharePostViaMessage({
      postId: post.id,
      userIds: [...selected],
    });
    setSending(false);

    if (result.error && result.sent === 0) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.sent === 1
        ? t('sentPostSingular')
        : `${t('sentPostToMultiple')} ${result.sent} ${t('personPlural')}`
    );
    onClose();
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: 'calc(80dvh - 120px)' }}>
      {/* Sub-header */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 transition-colors hover:bg-muted text-muted-foreground"
          aria-label={t('backAriaLabel')}
        >
          <ArrowRight className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
            <MessageCircle className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t('sendViaMessagesTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('sendViaMessagesDesc')}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPeoplePlaceholder')}
            className="ps-9 h-9 text-sm"
            dir={dir}
          />
        </div>
      </div>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3" style={{ scrollbarWidth: 'none' }}>
          {[...selected].map((uid) => {
            const u = users.find((x) => x.user_id === uid);
            if (!u) return null;
            return (
              <button
                key={uid}
                onClick={() => toggle(uid)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                {u.full_name.split(' ')[0]}
                <X className="size-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* Users list */}
      <div className="flex-1 overflow-y-auto px-4">
        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? t('noSearchResults') : t('noFollowersOrConversations')}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pb-2">
            {filtered.map((u) => {
              const isSelected = selected.has(u.user_id);
              return (
                <button
                  key={u.user_id}
                  onClick={() => toggle(u.user_id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-start transition-colors',
                    isSelected ? 'bg-primary/8' : 'hover:bg-muted'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                    ) : (
                      <UserInitials name={u.full_name} />
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username}
                      {u.has_conversation && (
                        <span className="ms-1 text-green-600 dark:text-green-500">{t('existingConversationLabel')}</span>
                      )}
                    </p>
                  </div>

                  {/* Checkbox */}
                  <div
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="px-4 pt-3 pb-1">
        <Button
          variant="brand"
          onClick={handleSend}
          disabled={!selected.size || sending}
          className="w-full gap-2"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageCircle className="size-4" />
          )}
          {sending
            ? t('sendingPostProgress')
            : selected.size
            ? `${t('sendToNPeoplePrefix')} ${selected.size} ${selected.size === 1 ? t('personSingular') : t('personPlural')}`
            : t('selectPersonFirst')}
        </Button>
      </div>
    </div>
  );
}
