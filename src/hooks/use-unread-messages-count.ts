'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useUnreadMessagesCount() {
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { data } = await supabaseRef.current.rpc('get_total_unread_count');
      return typeof data === 'number' ? data : Number(data ?? 0);
    },
    // Realtime invalidation is handled by NotificationListener.
    // 30s backup covers mark-as-read and edge cases.
    refetchInterval: 30_000,
    staleTime: 0,
  });

  return data ?? 0;
}
