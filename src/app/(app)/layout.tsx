import { Suspense } from 'react';
import { getCurrentAppUser } from '@/lib/supabase/get-current-user';
import { Navbar } from '@/components/layout/navbar';
import { NavbarSkeleton } from '@/components/layout/navbar-skeleton';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { GlobalRealtimeProvider } from '@/components/providers/global-realtime-provider';
import { GlobalPostComposer } from '@/components/layout/global-post-composer';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

/**
 * User-dependent shell pieces (mobile sidebar, realtime wiring, bottom nav,
 * composer). Pulled out of the layout body so its `await` happens inside a
 * <Suspense> boundary and never blocks the static shell from painting.
 */
async function AppShellUserBits() {
  const appUser = await getCurrentAppUser();

  // Mobile sidebar renders for guests too (login/menu options), matching the
  // previous always-rendered behavior — so pass a possibly-null user.
  const sidebarUser = appUser
    ? {
        username: appUser.username,
        full_name: appUser.full_name,
        avatar_url: appUser.avatar_url,
      }
    : null;

  return (
    <>
      <MobileSidebar user={sidebarUser} />
      {appUser && (
        <>
          <GlobalRealtimeProvider
            currentUserId={appUser.id}
            presencePrivacy={appUser.presence}
          />
          <MobileBottomNav username={appUser.username} />
          <GlobalPostComposer
            currentUser={{
              id: appUser.id,
              username: appUser.username,
              full_name: appUser.full_name,
              avatar_url: appUser.avatar_url,
            }}
          />
        </>
      )}
    </>
  );
}

/**
 * App shell. Intentionally NOT async: the structural frame (and the reserved
 * navbar/bottom-nav space) renders synchronously and instantly. The navbar and
 * the user-specific pieces stream in via their own <Suspense> boundaries, and
 * each page streams behind its own loading.tsx — so navigation paints the frame
 * immediately instead of blocking on auth + profile round-trips.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen pt-14 pb-16 md:pb-0">
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar />
        </Suspense>

        <Suspense fallback={null}>
          <AppShellUserBits />
        </Suspense>

        <div dir="rtl" className="mx-auto max-w-[1440px]">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
