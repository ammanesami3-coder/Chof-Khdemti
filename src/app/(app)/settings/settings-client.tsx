'use client';

import Link from 'next/link';
import {
  Bookmark,
  ChevronLeft,
  CreditCard,
  HelpCircle,
  LogOut,
  Pencil,
  Shield,
  User,
} from 'lucide-react';
import { BackButton } from '@/components/shared/back-button';
import { SoundSettings } from '@/components/settings/sound-settings';
import { DarkModeSettings } from '@/components/settings/dark-mode-settings';
import { LanguageSettings } from '@/components/settings/language-settings';
import { UserAvatar } from '@/components/shared/user-avatar';
import { AppLogo } from '@/components/layout/app-logo';
import { useLang } from '@/lib/i18n/language-context';

type Props = {
  userData: {
    username: string;
    full_name: string;
    account_type: string;
  } | null;
  avatarUrl: string | null;
};

function SettingsRow({
  icon: Icon,
  label,
  description,
  href,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60 ${danger ? 'text-destructive' : ''}`}
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-destructive/10' : 'bg-muted'}`}>
        <Icon className={`size-4 ${danger ? 'text-destructive' : 'text-foreground'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export function SettingsClient({ userData, avatarUrl }: Props) {
  const { t } = useLang();
  const isArtisan = userData?.account_type === 'artisan';

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <BackButton fallback="/" />
        <h1 className="text-2xl font-bold">{t('settings')}</h1>
      </div>

      {/* Profile card */}
      {userData && (
        <Link
          href={`/profile/${userData.username}`}
          className="mb-6 flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40"
        >
          <UserAvatar
            user={{ username: userData.username, full_name: userData.full_name, avatar_url: avatarUrl }}
            size="lg"
            linkable={false}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{userData.full_name}</p>
            <p className="text-sm text-muted-foreground">@{userData.username}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isArtisan ? t('artisanChip') : t('customerChip')} · {t('viewMyProfile')}
            </p>
          </div>
          <ChevronLeft className="size-5 shrink-0 text-muted-foreground/50" />
        </Link>
      )}

      {/* Account */}
      <section className="mb-6">
        <SectionTitle>{t('account')}</SectionTitle>
        <div className="overflow-hidden rounded-xl border bg-card divide-y">
          <SettingsRow icon={Pencil} label={t('editProfile')} href="/profile/edit" />
          <SettingsRow
            icon={User}
            label={t('accountInfo')}
            description={t('emailPassword')}
            href="/profile/edit"
          />
          {isArtisan && (
            <SettingsRow
              icon={CreditCard}
              label={t('subscription')}
              description={t('subscriptionDesc')}
              href="/settings/subscription"
            />
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mb-6">
        <SectionTitle>{t('content')}</SectionTitle>
        <div className="overflow-hidden rounded-xl border bg-card divide-y">
          <SettingsRow
            icon={Bookmark}
            label={t('savedPosts')}
            description={t('savedPostsDesc')}
            href="/saved"
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6">
        <SectionTitle>{t('notificationsSetting')}</SectionTitle>
        <SoundSettings />
      </section>

      {/* Appearance */}
      <section className="mb-6">
        <SectionTitle>{t('appearance')}</SectionTitle>
        <DarkModeSettings />
      </section>

      {/* Language */}
      <section className="mb-6">
        <SectionTitle>{t('language')}</SectionTitle>
        <LanguageSettings />
      </section>

      {/* Privacy & Support */}
      <section className="mb-6">
        <SectionTitle>{t('privacySupport')}</SectionTitle>
        <div className="overflow-hidden rounded-xl border bg-card divide-y">
          <SettingsRow icon={Shield} label={t('privacy')} href="/profile/edit" />
          <SettingsRow icon={HelpCircle} label={t('helpCenter')} href="/profile/edit" />
        </div>
      </section>

      {/* Logout */}
      <section className="mb-6">
        <div className="overflow-hidden rounded-xl border bg-card divide-y">
          <SettingsRow icon={LogOut} label={t('logout')} href="/logout" danger />
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 py-4">
        <AppLogo size="sm" href="" className="opacity-70" />
        <p className="text-xs text-muted-foreground/50">
          Chof Khdemti · {t('versionLabel')} 1.0
        </p>
      </div>
    </main>
  );
}
