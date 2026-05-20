import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountClient } from './account-client';

export const metadata = { title: 'الحساب والأمان — Chof Khdemti' };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <AccountClient
      email={user.email ?? ''}
      lastSignIn={user.last_sign_in_at ?? null}
    />
  );
}
