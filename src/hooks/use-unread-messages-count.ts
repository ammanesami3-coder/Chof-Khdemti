'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Realtime invalidation is handled centrally by GlobalRealtimeProvider.
// This hook is safe to call from multiple components simultaneously.
export function useUnreadMessagesCount() {
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (!session) return 0;

      const { count } = await supabaseRef.current
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', session.user.id);

      return count ?? 0;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  return data ?? 0;
}
