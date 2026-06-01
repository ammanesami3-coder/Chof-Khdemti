import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/require-user';
import { listModerators } from '@/lib/actions/admin-moderators';
import { ModeratorsClient } from './moderators-client';

export const metadata = { title: 'إدارة المشرفين — Chof Khdemti' };

export default async function ModeratorsPage() {
  const { supabase, user } = await requireUser();

  // Strict gate: admins only. Everyone else is bounced back to settings.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    redirect('/settings');
  }

  const moderators = await listModerators();

  return <ModeratorsClient initialModerators={moderators} />;
}
