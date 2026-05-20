import { FeedSkeleton } from '@/components/feed/feed-skeleton';

export default function SavedLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      <div className="mb-4 h-8 w-36 animate-pulse rounded-lg bg-muted" />
      <FeedSkeleton count={3} />
    </main>
  );
}
