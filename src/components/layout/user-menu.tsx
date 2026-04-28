'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings, User } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NavUser = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export function UserMenu({ user }: { user: NavUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/logout', { method: 'POST', redirect: 'manual' });
    router.push('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full ring-2 ring-transparent transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-primary"
        aria-label="قائمة المستخدم"
      >
        <UserAvatar user={user} size="sm" linkable={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => router.push(`/profile/${user.username}`)}
        >
          <User className="h-4 w-4" />
          ملفي الشخصي
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => router.push('/settings/subscription')}
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
