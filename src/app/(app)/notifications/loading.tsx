export default function NotificationsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6" dir="rtl">
      {/* Header skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Items skeleton */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Section label */}
        <div className="border-b bg-muted/30 px-4 py-2">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        </div>

        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
            <div className="size-11 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="size-12 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
