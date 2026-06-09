'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LanguageProvider } from '@/lib/i18n/language-context';

// Clears the entire query cache whenever the logged-in user changes.
// Also handles forced sign-outs (e.g. invalid/expired refresh token) by
// triggering a server-side re-render so that requireUser() can redirect to /login.
function AuthWatcher() {
  const queryClient = useQueryClient();
  const router = useRouter();

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id ?? null;

      // Only act once prevId is known and the user actually changed
      if (prevId !== undefined && id !== prevId) {
        queryClient.clear();

        // If the user just got signed out (forced or explicit) while they were
        // previously authenticated, refresh the server state. This causes Next.js
        // to re-run server components with the cleared cookies; protected pages
        // (requireUser) will redirect to /login, public pages render as guest.
        if (prevId !== null && id === null) {
          router.refresh();
        }
      }

      prevId = id;
    });

    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 1 min — fresh data isn't re-fetched on navigation
            gcTime: 5 * 60_000, // keep unmounted data cached for 5 min
            refetchOnWindowFocus: false, // avoid jarring re-fetches on mobile focus
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <LanguageProvider>
          <AuthWatcher />
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
