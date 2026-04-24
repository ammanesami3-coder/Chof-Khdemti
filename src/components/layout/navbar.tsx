import Link from 'next/link';
import { Home, MessageCircle, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TrialIndicator } from '@/components/subscription/trial-indicator';
import { UserMenu } from './user-menu';

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
    username: userRes.data.username,
    full_name: userRes.data.full_name,
    avatar_url: profileRes.data?.avatar_url ?? null,
  };
}

const NAV_LINKS = [
  { href: '/feed', label: 'الفيد', icon: Home },
  { href: '/explore', label: 'اكتشاف', icon: Search },
  { href: '/messages', label: 'رسائل', icon: MessageCircle },
] as const;

export async function Navbar() {
  const navUser = await getNavUser();
  if (!navUser) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        {/* يمين (start في RTL) — الشعار */}
        <Link href="/feed" className="text-base font-bold text-primary">
          Chof Khdemti
        </Link>

        {/* وسط — روابط التنقل (مخفية على الموبايل) */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* يسار (end في RTL) — مؤشر الاشتراك + الأفاتار */}
        <div className="flex items-center gap-2">
          <TrialIndicator />
          <UserMenu user={navUser} />
        </div>
      </nav>
    </header>
  );
}
