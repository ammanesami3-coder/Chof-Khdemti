'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  isArtisan: boolean;
  totalRatingsCount: number;
};

export function ProfileTabsList({ isArtisan, totalRatingsCount }: Props) {
  const { t } = useLang();

  return (
    <TabsList className="w-full rounded-none border-b bg-transparent p-0">
      <TabsTrigger
        value="posts"
        className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
      >
        {t('postsTab')}
      </TabsTrigger>
      <TabsTrigger
        value="about"
        className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
      >
        {t('aboutTab')}
      </TabsTrigger>
      {isArtisan && totalRatingsCount >= 1 && (
        <TabsTrigger
          id="profile-ratings-tab"
          value="ratings"
          className="flex-1 rounded-none border-b-2 border-transparent py-3 data-active:border-primary data-active:shadow-none"
        >
          {t('ratingsTab')}
          <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
            {totalRatingsCount}
          </span>
        </TabsTrigger>
      )}
    </TabsList>
  );
}
