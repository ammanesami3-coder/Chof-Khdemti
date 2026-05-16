import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';

export const metadata = { title: 'الإعدادات — Chof Khdemti' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('username, full_name, account_type').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle(),
  ]);

  return (
    <SettingsClient
      userData={userRes.data ?? null}
      avatarUrl={profileRes.data?.avatar_url ?? null}
    />
  );
}
