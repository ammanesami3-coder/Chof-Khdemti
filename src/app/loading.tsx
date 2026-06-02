/**
 * Root-level streaming fallback.
 *
 * Deliberately NOT a full-screen centered spinner — that read as a "blocking
 * full-page spinner" on every navigation. Instead this is a slim top progress
 * bar that signals activity without hiding the page or shifting layout. Routes
 * under (app) now render their shell instantly (see (app)/layout.tsx) and each
 * route streams behind its own loading.tsx, so this only ever flashes briefly
 * for top-level routes that lack their own boundary.
 */
export default function RootLoading() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20"
      role="status"
      aria-live="polite"
    >
      <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] bg-primary" />
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}
