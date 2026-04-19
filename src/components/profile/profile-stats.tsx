type Props = {
  postsCount: number;
  followersCount: number;
  followingCount: number;
};

export function ProfileStats({ postsCount, followersCount, followingCount }: Props) {
  return (
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border py-3 text-center">
      <Stat label="منشورات" value={postsCount} />
      <Stat label="متابِعون" value={followersCount} />
      <Stat label="يتابع" value={followingCount} />
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
