import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/supabase/get-current-user';
import { listModerators } from '@/lib/actions/admin-moderators';
import { ModeratorsClient } from './moderators-client';

export const metadata = { title: 'إدارة المشرفين — Chof Khdemti' };

export default async function ModeratorsPage() {
  // Iron-clad server-side gate: the role is read fresh from the database in
  // server context. Non-admins are redirected before any moderator markup is
  // rendered; listModerators() independently re-checks admin via service role.
  if (!(await isCurrentUserAdmin())) {
    redirect('/settings');
  }

  const moderators = await listModerators();

  return <ModeratorsClient initialModerators={moderators} />;
}
