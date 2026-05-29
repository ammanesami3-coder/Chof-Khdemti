'use client';

import { useLang } from '@/lib/i18n/language-context';

type Props = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
};

export function ProfileStats({
  postsCount,
  followersCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
}: Props) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border py-3 text-center">
      <Stat label={t('posts')} value={postsCount} />
      <Stat label={t('followers')} value={followersCount} onClick={onFollowersClick} />
      <Stat label={t('following')} value={followingCount} onClick={onFollowingClick} />
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const content = (
    <>
      <span className="text-xl font-bold leading-none">{value.toLocaleString('en')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col gap-0.5 px-2 transition-colors hover:text-primary focus-visible:outline-none"
      >
        {content}
      </button>
    );
  }

  return <div className="flex flex-col gap-0.5 px-2">{content}</div>;
}
