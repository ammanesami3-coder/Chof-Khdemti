import { Skeleton } from '@/components/ui/skeleton';
import { ExploreGridSkeleton } from '@/components/explore/explore-grid-skeleton';

export default function ExploreLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* Page title */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-44 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>

      {/* Filters bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full rounded-md sm:max-w-xs" />
        <Skeleton className="h-10 w-36 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      <ExploreGridSkeleton count={6} />
    </main>
  );
}
