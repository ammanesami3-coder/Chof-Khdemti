'use client';

import { useLang } from '@/lib/i18n/language-context';

type Props = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

export function ProfileStats({ postsCount, followersCount, followingCount }: Props) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border py-3 text-center">
      <Stat label={t('posts')} value={postsCount} />
      <Stat label={t('followers')} value={followersCount} />
      <Stat label={t('following')} value={followingCount} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 px-2">
      <span className="text-xl font-bold leading-none">{value.toLocaleString('en')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
