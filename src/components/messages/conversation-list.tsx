'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationListItem } from './conversation-list-item';
import { ConversationListSkeleton } from './conversation-list-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = {
  initialData:   ConversationRow[];
  currentUserId: string;
};

function sortConversations(list: ConversationRow[]): ConversationRow[] {
  return [...list].sort((a, b) => {
    // Pinned first
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    // Then by last message date descending
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
}

export function ConversationList({ initialData, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const { data: conversations, isLoading } = useQuery({
    queryKey:    ['conversations'],
    queryFn:     fetchUserConversations,
    initialData: sortConversations(initialData),
    staleTime:   30_000,
    select:      sortConversations,
  });

  // ── Realtime: refresh on conversation update (new message) ────────────────
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => { queryClient.invalidateQueries({ queryKey: ['conversations'] }); },
      )
      .on(
        // When a conversation is restored (deleted_at cleared by trigger), refresh
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_settings' },
        () => { queryClient.invalidateQueries({ queryKey: ['conversations'] }); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, queryClient]);

  // ── Optimistic updates from ConversationListItem ──────────────────────────
  const handleOptimisticUpdate = useCallback(
    (id: string, patch: Partial<ConversationRow & { _delete?: boolean }>) => {
      queryClient.setQueryData(['conversations'], (old: ConversationRow[] | undefined) => {
        if (!old) return old;

        // Local delete: filter out
        if ('_delete' in patch && patch._delete) {
          return old.filter((c) => c.id !== id);
        }

        // Update matching conversation
        const updated = old.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        );
        return sortConversations(updated);
      });
    },
    [queryClient],
  );

  if (isLoading && !initialData.length) return <ConversationListSkeleton />;

  if (!conversations?.length) {
    return (
      <div className="px-4 pt-8">
        <EmptyState
          icon={MessageCircle}
          title="لا توجد محادثات بعد"
          description="ابدأ بالاكتشاف وتواصل مع الحرفيين"
          action={{ label: 'اكتشف حرفيين', href: '/explore' }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conv={conv}
          currentUserId={currentUserId}
          onOptimisticUpdate={handleOptimisticUpdate}
        />
      ))}
    </div>
  );
}
