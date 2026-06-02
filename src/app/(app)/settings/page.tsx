import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/supabase/get-current-user';
import { SettingsClient } from './settings-client';

export const metadata = { title: 'الإعدادات — Chof Khdemti' };

export default async function SettingsPage() {
  // Reuses the request-deduped shell fetch (the (app) layout already resolved
  // it), so this page adds zero extra auth/profile round-trips. `isAdmin` is
  // computed from the role read server-side here — the admin section's markup
  // is only emitted when it is true, never gated on client state.
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect('/login');

  return (
    <SettingsClient
      userData={{
        username: appUser.username,
        full_name: appUser.full_name,
        account_type: appUser.account_type,
      }}
      avatarUrl={appUser.avatar_url}
      isAdmin={appUser.role === 'admin'}
    />
  );
}
