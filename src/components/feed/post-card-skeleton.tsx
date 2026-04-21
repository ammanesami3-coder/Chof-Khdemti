import { Skeleton } from "@/components/ui/skeleton";

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3" aria-busy="true" aria-label="جاري التحميل">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <Skeleton className="size-7 rounded-full" />
      </div>

      {/* Text lines */}
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3.5 w-full rounded-full" />
        <Skeleton className="h-3.5 w-4/5 rounded-full" />
        <Skeleton className="h-3.5 w-2/3 rounded-full" />
      </div>

      {/* Media placeholder */}
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="ms-auto h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

/** Renders N skeleton cards for list placeholders */
export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
