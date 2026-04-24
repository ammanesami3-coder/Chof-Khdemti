import { Skeleton } from '@/components/ui/skeleton';

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </div>
  );
}
