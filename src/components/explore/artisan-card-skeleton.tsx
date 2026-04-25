import { Skeleton } from '@/components/ui/skeleton';

export function ArtisanCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      {/* Header: avatar + name/username */}
      <div className="flex items-start gap-3">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Follow button */}
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}
