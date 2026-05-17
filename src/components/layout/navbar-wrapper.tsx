import type { ReactNode } from 'react';

export function NavbarWrapper({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {children}
    </header>
  );
}
