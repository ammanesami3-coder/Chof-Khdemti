'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Clears the entire query cache whenever the logged-in user changes.
// Without this, switching accounts would show stale data until staleTime expires.
function AuthWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    // undefined = not yet known; null = logged out; string = user id
    let prevId: string | null | undefined = undefined;

    // Seed prevId with the current session before the listener fires
    supabase.auth.getUser().then(({ data: { user } }) => {
      prevId = user?.id ?? null;
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;

      // Only act once prevId is known and the user actually changed
      if (prevId !== undefined && id !== prevId) {
        queryClient.clear();
      }

      prevId = id;
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWatcher />
      {children}
    </QueryClientProvider>
  );
}
