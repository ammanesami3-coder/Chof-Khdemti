'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useUnreadMessagesCount() {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { data } = await supabaseRef.current.rpc('get_total_unread_count');
      return typeof data === 'number' ? data : Number(data ?? 0);
    },
    refetchInterval: 30_000, // backup polling every 30s
    staleTime: 0,
  });

  // Realtime: any change to messages (INSERT = new msg, UPDATE = is_read changed)
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel('unread-count-listener')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return data ?? 0;
}
