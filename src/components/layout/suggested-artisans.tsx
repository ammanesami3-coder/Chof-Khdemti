'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { SubscribedBadge } from '@/components/shared/subscribed-badge';
import { useLang } from '@/lib/i18n/language-context';
import { getCraftName } from '@/lib/constants/crafts';
import { getCityName } from '@/lib/constants/cities';

export type SuggestedArtisan = {
  id: string;
  username: string;
  full_name: string;
  craft_category: string | null;
  city: string | null;
  avatar_url: string | null;
  is_subscribed?: boolean;
};

type Props = {
  artisans: SuggestedArtisan[];
};

function ArtisanRow({ artisan, lang }: { artisan: SuggestedArtisan; lang: 'ar' | 'fr' | 'en' }) {
  const { t } = useLang();
  const craftName = artisan.craft_category ? getCraftName(artisan.craft_category, lang) : null;
  const cityName  = artisan.city           ? getCityName(artisan.city, lang)            : null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl p-2 transition-colors duration-200 hover:bg-accent group">
      <Link href={`/profile/${artisan.username}`} className="shrink-0">
        <UserAvatar
          user={{ username: artisan.username, full_name: artisan.full_name, avatar_url: artisan.avatar_url }}
          size="sm"
          linkable={false}
          userId={artisan.id}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${artisan.username}`} className="block">
          <p className="flex items-center gap-1 truncate text-sm font-semibold group-hover:text-[#FF9F43] transition-colors">
            <span className="truncate">{artisan.full_name}</span>
            {artisan.is_subscribed && <SubscribedBadge size="xs" />}
          </p>
          {(craftName || cityName) && (
            <p className="truncate text-xs text-muted-foreground">
              {craftName ?? cityName}
            </p>
          )}
        </Link>
      </div>
      <Link href={`/profile/${artisan.username}`} className="btn-follow">
        {t('follow')}
      </Link>
    </div>
  );
}

export function SuggestedArtisans({ artisans }: Props) {
  const { t, lang } = useLang();
  const tips = [t('tipText1'), t('tipText2'), t('tipText3')];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  if (artisans.length === 0) return null;

  return (
    <>
      {/* Suggested artisans */}
      <div>
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF9F43]" />
            <h3 className="text-sm font-semibold">{t('suggestedArtisans')}</h3>
          </div>
          <Link
            href="/explore"
            className="text-xs font-medium text-[#FF9F43] transition-colors hover:text-[#E88A38]"
          >
            {t('viewAll')}
          </Link>
        </div>
        <div className="space-y-0.5">
          {artisans.map((a) => (
            <ArtisanRow key={a.id} artisan={a} lang={lang} />
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Daily tip */}
      <div className="rounded-xl bg-[#FF9F43]/8 p-4 dark:bg-[#FF9F43]/10">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[#FF9F43]">★</span>
          <p className="text-xs font-semibold text-[#E88A38] dark:text-[#FFBA69]">{t('tipOfDay')}</p>
        </div>
        <p className="text-xs leading-relaxed text-foreground/70 dark:text-foreground/60">{tip}</p>
      </div>
    </>
  );
}
