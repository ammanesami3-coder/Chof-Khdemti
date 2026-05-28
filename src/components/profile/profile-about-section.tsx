'use client';

import { useLang } from '@/lib/i18n/language-context';

type Props = {
  bio: string | null;
  joinedAt: string;
  yearsExperience: number | null;
};

export function ProfileAboutSection({ bio, joinedAt, yearsExperience }: Props) {
  const { t } = useLang();

  return (
    <div className="p-4 space-y-4">
      {bio && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{t('bioSectionLabel')}</h3>
          <p className="text-sm leading-relaxed">{bio}</p>
        </div>
      )}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{t('memberSince')}</h3>
        <p className="text-sm">{joinedAt}</p>
      </div>
      {yearsExperience != null && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{t('yearsExperienceLabel')}</h3>
          <p className="text-sm">{yearsExperience} {t('yearSuffix')}</p>
        </div>
      )}
    </div>
  );
}
