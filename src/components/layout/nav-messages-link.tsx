'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages-count';

export function NavMessagesLink() {
  const count = useUnreadMessagesCount();

  return (
    <Link
      href="/messages"
      className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <span className="relative">
        <MessageCircle className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      رسائل
    </Link>
  );
}
