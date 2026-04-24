'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useUnreadMessagesCount(userId: string | null) {
  const [count, setCount] = useState(0);
  const clientRef = useRef(createClient());

  useEffect(() => {
    if (!userId) return;
    const supabase = clientRef.current;

    async function fetchCount() {
      const { data } = await supabase.rpc('get_total_unread_count');
      setCount(typeof data === 'number' ? data : Number(data ?? 0));
    }

    fetchCount();

    // conversations UPDATE يُطلق trigger trg_update_last_message_at عند كل رسالة جديدة
    // — يكفي الاشتراك هنا بدل messages INSERT (Realtime على conversations مُفعَّل بالفعل)
    const channel = supabase
      .channel('navbar-unread-badge')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        fetchCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
