import { Loader2 } from 'lucide-react';

/**
 * Root-level streaming fallback. The home feed (src/app/page.tsx) awaits its
 * data server-side and previously had no loading boundary, so navigating home
 * stalled on the old frame with no feedback. This neutral shell renders
 * instantly on navigation, then streams in the resolved page — keeping the
 * frame responsive and avoiding the "stuck then jump" layout shift. Kept
 * visually neutral so it reads fine for any route without its own loading.tsx.
 */
export default function RootLoading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-7 animate-spin text-muted-foreground/60" aria-hidden="true" />
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}
