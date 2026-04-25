import { Skeleton } from '@/components/ui/skeleton';

export function ReviewCardSkeleton() {
  return (
    <div className="space-y-2.5 border-b py-4 last:border-b-0">
      {/* Avatar + name + stars */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        </div>
        {/* Stars (5 small circles) */}
        <div className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="size-4 rounded-full" />
          ))}
        </div>
      </div>

      {/* Comment lines */}
      <Skeleton className="h-3.5 w-full rounded-full" />
      <Skeleton className="h-3.5 w-2/3 rounded-full" />

      {/* Date */}
      <Skeleton className="h-3 w-24 rounded-full" />
    </div>
  );
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}
