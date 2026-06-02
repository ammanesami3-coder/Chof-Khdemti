import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/supabase/get-current-user';
import { getModerationCapabilities } from '@/lib/actions/moderation';
import { SettingsClient } from './settings-client';
import { SettingsSkeleton } from '@/components/settings/settings-skeleton';

export const metadata = { title: 'الإعدادات — Chof Khdemti' };

/**
 * Streams the settings menu. Reuses the request-deduped shell fetch (the (app)
 * layout already resolved it), so this adds zero extra round-trips. `isAdmin`
 * is computed from the role read server-side here — the admin section's markup
 * is only emitted when true, never gated on client state.
 */
async function SettingsData() {
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect('/login');

  // Moderation capabilities decide which admin/moderator entries appear.
  const caps = await getModerationCapabilities();

  return (
    <SettingsClient
      userData={{
        username: appUser.username,
        full_name: appUser.full_name,
        account_type: appUser.account_type,
      }}
      avatarUrl={appUser.avatar_url}
      isAdmin={caps.isAdmin}
      canViewReports={caps.canViewReports}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}
