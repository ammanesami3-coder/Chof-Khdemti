import { createClient } from '@/lib/supabase/server';
import { TrialIndicator } from '@/components/subscription/trial-indicator';
import { UserMenu } from './user-menu';
import { NavMessagesLink } from './nav-messages-link';
import { ThemeToggle } from './theme-toggle';
import { NotificationsNavLink } from '@/components/notifications/notifications-nav-link';
import { GlobalSearchBar } from './global-search-bar';
import { NavLinks } from './nav-links';
import { MobileSearchButton } from './mobile-search-button';
import { NavbarWrapper } from './navbar-wrapper';
import { AppLogo } from './app-logo';
import { GuestNavButtons } from './guest-nav-buttons';

async function getNavUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('username, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single(),
  ]);

  if (!userRes.data) return null;

  return {
    id: user.id,
    username: userRes.data.username,
    full_name: userRes.data.full_name,
    avatar_url: profileRes.data?.avatar_url ?? null,
  };
}

const NAV_CLASS = 'mx-auto flex h-14 max-w-5xl items-center gap-2 px-4';

export async function Navbar() {
  const navUser = await getNavUser();

  /* ── نسخة الزوار ─────────────────────────────────────── */
  if (!navUser) {
    return (
      <NavbarWrapper>
        <nav className={NAV_CLASS}>
          <AppLogo size="sm" />

          <div className="hidden flex-1 max-w-sm sm:block">
            <GlobalSearchBar />
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <NavLinks />
          </div>

          <div className="flex items-center gap-1 ms-auto">
            <div className="sm:hidden">
              <MobileSearchButton />
            </div>
            <ThemeToggle />
            <GuestNavButtons />
          </div>
        </nav>
      </NavbarWrapper>
    );
  }

  /* ── نسخة المستخدم المسجّل ─────────────────────────── */
  return (
    <NavbarWrapper>
      <nav className={NAV_CLASS}>
        <AppLogo size="sm" />

        <div className="hidden flex-1 max-w-md sm:block">
          <GlobalSearchBar />
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <NavLinks />
          <NavMessagesLink />
          <NotificationsNavLink />
        </div>

        <div className="flex items-center gap-1 ms-auto">
          <TrialIndicator />
          <div className="flex items-center sm:hidden">
            <MobileSearchButton />
            <NavMessagesLink showLabel={false} />
            <NotificationsNavLink showLabel={false} />
          </div>
          <ThemeToggle />
          <UserMenu user={navUser} />
        </div>
      </nav>
    </NavbarWrapper>
  );
}
