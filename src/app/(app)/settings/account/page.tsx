import { requireUser } from '@/lib/supabase/require-user';
import { AccountClient } from './account-client';

export const metadata = { title: 'الحساب والأمان — Chof Khdemti' };

export default async function AccountPage() {
  const { user } = await requireUser();

  return (
    <AccountClient
      email={user.email ?? ''}
      lastSignIn={user.last_sign_in_at ?? null}
    />
  );
}
