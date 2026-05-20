import { FeedSkeleton } from '@/components/feed/feed-skeleton';

export default function PostLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      <FeedSkeleton count={1} />
    </main>
  );
}
