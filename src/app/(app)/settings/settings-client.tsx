'use client';

import Link from 'next/link';
import {
  Bookmark,
  ChevronLeft,
  CreditCard,
  HelpCircle,
  Key,
  LogOut,
  Pencil,
  Shield,
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
  iconBg = 'bg-muted',
  iconColor = 'text-foreground',
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  href: string;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3.5 transition-all duration-150 hover:bg-muted/50 active:scale-[0.99] ${danger ? 'text-destructive' : ''}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
          danger ? 'bg-destructive/10' : iconBg
        }`}
      >
        <Icon
          className={`size-[18px] ${danger ? 'text-destructive' : iconColor}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:-translate-x-0.5" />
    </Link>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </h2>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/40">
      {children}
    </div>
  );
}

export function SettingsClient({ userData, avatarUrl }: Props) {
  const { t } = useLang();
  const isArtisan = userData?.account_type === 'artisan';

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/" />
        <h1 className="text-2xl font-bold">{t('settings')}</h1>
      </div>

      {/* Profile card */}
      {userData && (
        <Link
          href={`/profile/${userData.username}`}
          className="mb-6 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted/30 active:scale-[0.99]"
        >
          <div className="relative">
            <UserAvatar
              user={{
                username: userData.username,
                full_name: userData.full_name,
                avatar_url: avatarUrl,
              }}
              size="lg"
              linkable={false}
            />
            <span className="absolute bottom-0 end-0 size-3 rounded-full border-2 border-card bg-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{userData.full_name}</p>
            <p className="text-sm text-muted-foreground">@{userData.username}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {isArtisan ? t('artisanChip') : t('customerChip')}
            </p>
          </div>
          <ChevronLeft className="size-5 shrink-0 text-muted-foreground/40" />
        </Link>
      )}

      {/* Account */}
      <section className="mb-5">
        <SectionTitle>{t('account')}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={Pencil}
            label={t('editProfile')}
            description={t('editProfileDesc')}
            href="/profile/edit"
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <SettingsRow
            icon={Key}
            label={t('accountInfo')}
            description={t('emailPassword')}
            href="/settings/account"
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          {isArtisan && (
            <SettingsRow
              icon={CreditCard}
              label={t('subscription')}
              description={t('subscriptionDesc')}
              href="/settings/subscription"
              iconBg="bg-green-50 dark:bg-green-950/40"
              iconColor="text-green-600 dark:text-green-400"
            />
          )}
        </SettingsCard>
      </section>

      {/* Content */}
      <section className="mb-5">
        <SectionTitle>{t('content')}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={Bookmark}
            label={t('savedPosts')}
            description={t('savedPostsDesc')}
            href="/saved"
            iconBg="bg-orange-50 dark:bg-orange-950/40"
            iconColor="text-orange-500 dark:text-orange-400"
          />
        </SettingsCard>
      </section>

      {/* Notifications */}
      <section className="mb-5">
        <SectionTitle>{t('notificationsSetting')}</SectionTitle>
        <SoundSettings />
      </section>

      {/* Appearance */}
      <section className="mb-5">
        <SectionTitle>{t('appearance')}</SectionTitle>
        <DarkModeSettings />
      </section>

      {/* Language */}
      <section className="mb-5">
        <SectionTitle>{t('language')}</SectionTitle>
        <LanguageSettings />
      </section>

      {/* Privacy & Support */}
      <section className="mb-5">
        <SectionTitle>{t('privacySupport')}</SectionTitle>
        <SettingsCard>
          <SettingsRow
            icon={Shield}
            label={t('privacy')}
            description={t('privacyDesc')}
            href="/settings/privacy"
            iconBg="bg-teal-50 dark:bg-teal-950/40"
            iconColor="text-teal-600 dark:text-teal-400"
          />
          <SettingsRow
            icon={HelpCircle}
            label={t('helpCenter')}
            description={t('helpDesc')}
            href="/settings/help"
            iconBg="bg-sky-50 dark:bg-sky-950/40"
            iconColor="text-sky-600 dark:text-sky-400"
          />
        </SettingsCard>
      </section>

      {/* Logout */}
      <section className="mb-6">
        <SettingsCard>
          <SettingsRow icon={LogOut} label={t('logout')} href="/logout" danger />
        </SettingsCard>
      </section>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 py-4">
        <AppLogo size="sm" href="" className="opacity-60" />
        <p className="text-xs text-muted-foreground/40">
          Chof Khdemti · {t('versionLabel')} 1.0
        </p>
      </div>
    </main>
  );
}
