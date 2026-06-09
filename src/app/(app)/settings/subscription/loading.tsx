/**
 * Route-level fallback for the subscription page. Mirrors the real page's
 * dimensions (header, status card, progress bar, action button) so navigation
 * paints an identically-shaped skeleton with no layout shift.
 */
export default function SubscriptionLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 h-8 w-32 animate-pulse rounded-lg bg-muted" />

      {/* Status card */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-card p-6">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mb-3 h-4 w-56 animate-pulse rounded bg-muted" />
        {/* trial progress bar */}
        <div className="mb-2 h-2 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>

      {/* Action button */}
      <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
    </main>
  );
}
