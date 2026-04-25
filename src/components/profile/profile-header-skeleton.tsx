import { Skeleton } from '@/components/ui/skeleton';

export function ProfileHeaderSkeleton() {
  return (
    <div aria-busy="true" aria-label="جاري تحميل الملف الشخصي">
      {/* Cover */}
      <Skeleton className="h-44 w-full rounded-none sm:h-52" />

      {/* Avatar overlap */}
      <div className="px-4">
        <div className="-mt-16 mb-3 inline-block">
          <Skeleton className="size-32 rounded-full border-4 border-background" />
        </div>
      </div>

      {/* Info + actions row */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          {/* Name + username */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Badges row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Bio */}
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-3/4 rounded-full" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border py-3 text-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 px-2">
            <Skeleton className="h-6 w-8 rounded-full" />
            <Skeleton className="h-3 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
