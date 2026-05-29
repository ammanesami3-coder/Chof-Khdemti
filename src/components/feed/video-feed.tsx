'use client';

import { Video } from 'lucide-react';
import { FeedList } from '@/components/feed/feed-list';
import { useLang } from '@/lib/i18n/language-context';
import type { FeedPage } from '@/lib/queries/posts';

type CurrentUser = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Props = {
  currentUser: CurrentUser | null;
  initialFeed: FeedPage;
};

export function VideoFeed({ currentUser, initialFeed }: Props) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-[680px] px-3 sm:px-4 py-4 lg:py-6 pb-24 md:pb-8">
      {/* Page header */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Video className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">{t('videosTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('videosSubtitle')}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-5 h-px bg-border" />

      {/* Feed */}
      <FeedList
        feedType="videos"
        currentUserId={currentUser?.id}
        currentUser={currentUser ?? undefined}
        initialData={initialFeed}
      />
    </div>
  );
}
