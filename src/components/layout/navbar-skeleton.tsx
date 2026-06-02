import { AppLogo } from './app-logo';

/**
 * Instant, static placeholder for <Navbar> while its (deduped) user fetch
 * streams in. Same fixed bar + height (h-14) as the real navbar, so there is
 * zero layout shift when it swaps in. Rendered as a <Suspense> fallback from
 * the app layout — this is what makes the chrome paint in well under 100ms.
 */
export function NavbarSkeleton() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center h-14 px-4 gap-3">
        <AppLogo size="md" />
        <div className="h-9 w-[220px] max-w-[60%] animate-pulse rounded-full bg-muted" />
        <div className="flex-1" />
        <div className="size-9 animate-pulse rounded-full bg-muted" />
      </div>
    </header>
  );
}
