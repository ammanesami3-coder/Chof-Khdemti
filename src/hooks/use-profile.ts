'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useProfile(username: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, profiles(*)')
        .eq('username', username)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}
