import { requireUser } from '@/lib/supabase/require-user';
import { SettingsClient } from './settings-client';

export const metadata = { title: 'الإعدادات — Chof Khdemti' };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('username, full_name, account_type').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url, role').eq('user_id', user.id).maybeSingle(),
  ]);

  return (
    <SettingsClient
      userData={userRes.data ?? null}
      avatarUrl={profileRes.data?.avatar_url ?? null}
      isAdmin={profileRes.data?.role === 'admin'}
    />
  );
}
