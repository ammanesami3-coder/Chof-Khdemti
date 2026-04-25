import { Skeleton } from '@/components/ui/skeleton';
import { ProfileHeaderSkeleton } from './profile-header-skeleton';
import { PostCardSkeleton } from '@/components/feed/post-card-skeleton';

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileHeaderSkeleton />

      {/* Tabs bar */}
      <div className="mt-2 flex border-b">
        {[0, 1].map((i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4 pt-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}
