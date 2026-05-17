'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar-context';

export function MobileMenuButton() {
  const { toggleMobile } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleMobile}
      aria-label="فتح القائمة الجانبية"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
