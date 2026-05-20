export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mb-6 h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-5">
        {[1, 2, 3].map((s) => (
          <div key={s} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
