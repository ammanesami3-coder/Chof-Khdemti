import { createClient } from '@/lib/supabase/server';
import { TrialIndicator } from '@/components/subscription/trial-indicator';
import { UserMenu } from './user-menu';
import { ThemeToggle } from './theme-toggle';
import { GlobalSearchBar } from './global-search-bar';
import { NavbarWrapper } from './navbar-wrapper';
import { AppLogo } from './app-logo';
import { GuestNavButtons } from './guest-nav-buttons';
import { MobileMenuButton } from './mobile-menu-button';
import { MobileSearchButton } from './mobile-search-button';
import { MobileNotifButton } from './mobile-notif-button';
import { CenterNav, GuestCenterNav } from './center-nav';

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

/* ─────────────────────────────────────────────────────────────────────────── */

export async function Navbar() {
  const navUser = await getNavUser();

  /* ── نسخة الزوار ─────────────────────────────────────── */
  if (!navUser) {
    return (
      <NavbarWrapper>
        {/* Desktop (md+): 3-column */}
        <nav className="relative hidden md:flex items-stretch h-14 px-4">
          {/* RIGHT: Logo + Search */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <AppLogo size="md" />
            <div className="w-[220px] lg:w-[252px] xl:w-[268px]">
              <GlobalSearchBar />
            </div>
          </div>

          {/* CENTER: Home + Artisans (absolutely centered) */}
          <div className="absolute left-1/2 top-0 bottom-0 flex items-stretch -translate-x-1/2">
            <GuestCenterNav />
          </div>

          {/* LEFT: Theme + Login/Signup */}
          <div className="flex items-center gap-2 ms-auto flex-shrink-0">
            <ThemeToggle />
            <GuestNavButtons />
          </div>
        </nav>

        {/* Mobile (<md): compact bar */}
        <nav className="flex md:hidden items-center h-14 px-3 gap-1">
          <AppLogo size="sm" />
          <MobileSearchButton />
          <div className="flex-1" />
          <ThemeToggle />
          <GuestNavButtons />
          <MobileMenuButton />
        </nav>
      </NavbarWrapper>
    );
  }

  /* ── نسخة المستخدم المسجّل ─────────────────────────── */
  return (
    <NavbarWrapper>
      {/*
        Desktop (md+) — Facebook-style 3-column layout (RTL):
          RIGHT: Logo (md) + Search (220→268px)
          CENTER: 5 nav icons, absolute-centered
          LEFT:  TrialIndicator + ThemeToggle + UserMenu avatar (md)
      */}
      <nav className="relative hidden md:flex items-stretch h-14 px-4">
        {/* RIGHT: Logo + Search */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <AppLogo size="md" />
          <div className="w-[220px] lg:w-[252px] xl:w-[268px]">
            <GlobalSearchBar />
          </div>
        </div>

        {/* CENTER: 5 nav icons (absolute — always at 50% of navbar) */}
        <div className="absolute left-1/2 top-0 bottom-0 flex items-stretch -translate-x-1/2 pointer-events-none">
          <div className="pointer-events-auto">
            <CenterNav />
          </div>
        </div>

        {/* LEFT: account status + theme toggle + profile avatar
            In RTL flex, DOM order [Trial][Theme][UserMenu] renders visually as
            [UserMenu (far-left screen edge)] [Theme] [Trial (closest to center)] */}
        <div className="flex items-center gap-1.5 ms-auto flex-shrink-0">
          <TrialIndicator />
          <ThemeToggle />
          <UserMenu user={navUser} />
        </div>
      </nav>

      {/* Mobile (<md): compact bar — bottom nav handles navigation */}
      <nav className="flex md:hidden items-center h-14 px-3 gap-1">
        <MobileMenuButton />
        <AppLogo size="sm" />
        <MobileSearchButton />
        <div className="flex-1" />
        <TrialIndicator />
        <MobileNotifButton />
        <ThemeToggle />
        <UserMenu user={navUser} />
      </nav>
    </NavbarWrapper>
  );
}
