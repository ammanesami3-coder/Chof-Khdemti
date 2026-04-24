'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationListItem } from './conversation-list-item';
import { ConversationListSkeleton } from './conversation-list-skeleton';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = {
  initialData: ConversationRow[];
  currentUserId: string;
};

export function ConversationList({ initialData, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchUserConversations,
    initialData,
    staleTime: 30_000,
  });

  // Realtime: إعادة جلب القائمة عند تحديث last_message_at في conversations
  // (يُطلق trigger trg_update_last_message_at عند كل رسالة جديدة)
  // ملاحظة: يجب تفعيل Realtime على جدول conversations من Supabase Dashboard
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  if (isLoading && !initialData.length) {
    return <ConversationListSkeleton />;
  }

  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">لا توجد محادثات بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ابدأ محادثة من ملف أي حرفي
          </p>
        </div>
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
        />
      ))}
    </div>
  );
}
