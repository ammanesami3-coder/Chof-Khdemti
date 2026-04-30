'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Realtime invalidation (optimistic + verify) is handled centrally by
// GlobalRealtimeProvider. Safe to call from multiple components.
export function useUnreadMessagesCount() {
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { data, error } = await supabaseRef.current.rpc('get_total_unread_count');
      if (error) return 0;
      return typeof data === 'number' ? data : Number(data ?? 0);
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  return data ?? 0;
}
