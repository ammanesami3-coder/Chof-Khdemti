'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type SidebarCtx = {
  mobileOpen: boolean;
  openMobile:  () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarCtx>({
  mobileOpen: false,
  openMobile:   () => {},
  closeMobile:  () => {},
  toggleMobile: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        openMobile:   () => setMobileOpen(true),
        closeMobile:  () => setMobileOpen(false),
        toggleMobile: () => setMobileOpen((p) => !p),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
