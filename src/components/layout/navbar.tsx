import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TrialIndicator } from '@/components/subscription/trial-indicator';
import { UserMenu } from './user-menu';
import { NavMessagesLink } from './nav-messages-link';
import { ThemeToggle } from './theme-toggle';
import { buttonVariants } from '@/components/ui/button';

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

const STATIC_NAV_LINKS = [
  { href: '/feed', label: 'الفيد', icon: Home },
  { href: '/explore', label: 'اكتشاف', icon: Search },
] as const;

const HEADER_CLASS =
  "sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60";
const NAV_CLASS = "mx-auto flex h-14 max-w-4xl items-center justify-between px-4";
const NAV_LINK_CLASS =
  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export async function Navbar() {
  const navUser = await getNavUser();

  /* ── نسخة الزوار (غير مسجّلين) ─────────────────────────────────────── */
  if (!navUser) {
    return (
      <header className={HEADER_CLASS}>
        <nav className={NAV_CLASS}>
          <Link href="/" className="text-base font-bold text-primary">
            Chof Khdemti
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/explore" className={NAV_LINK_CLASS}>
              <Search className="h-4 w-4" />
              اكتشاف
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              دخول
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              حساب جديد
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  /* ── نسخة المستخدم المسجّل ───────────────────────────────────────────── */
  return (
    <header className={HEADER_CLASS}>
      <nav className={NAV_CLASS}>
        {/* يمين (start في RTL) — الشعار */}
        <Link href="/feed" className="text-base font-bold text-primary">
          Chof Khdemti
        </Link>

        {/* وسط — روابط التنقل (مخفية على الموبايل) */}
        <div className="hidden items-center gap-1 sm:flex">
          {STATIC_NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={NAV_LINK_CLASS}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <NavMessagesLink />
        </div>

        {/* يسار (end في RTL) — مؤشر الاشتراك + تبديل الثيم + الأفاتار */}
        <div className="flex items-center gap-1">
          <TrialIndicator />
          <ThemeToggle />
          <UserMenu user={navUser} />
        </div>
      </nav>
    </header>
  );
}
