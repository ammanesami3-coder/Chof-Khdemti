'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchUserConversations } from '@/lib/queries/conversations';
import { ConversationListItem } from './conversation-list-item';
import { ConversationListSkeleton } from './conversation-list-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { ConversationRow } from '@/lib/queries/conversations';

type Props = {
  initialData: ConversationRow[];
  currentUserId: string;
};

export function ConversationList({ initialData, currentUserId }: Props) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

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
      <div className="px-4 pt-8">
        <EmptyState
          icon={MessageCircle}
          title="لا توجد محادثات بعد"
          description="ابدأ بالاكتشاف وتواصل مع الحرفيين"
          action={{ label: "اكتشف حرفيين", href: "/explore" }}
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
        />
      ))}
    </div>
  );
}
