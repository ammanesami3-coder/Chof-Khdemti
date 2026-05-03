'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// Uses a direct table query instead of a custom RPC so it works even if
// the get_total_unread_count() function hasn't been deployed yet.
// RLS on `messages` ensures we only see rows in our own conversations.
export function useUnreadMessagesCount() {
  const supabaseRef = useRef(createClient());

  const { data } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const supabase = supabaseRef.current;

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', authData.user.id);

      if (error) return 0;
      return count ?? 0;
    },
    staleTime: 0,
    refetchInterval: 5_000,
  });

  return data ?? 0;
}
