import { redirect } from 'next/navigation';
import { EditProfileForm } from './edit-profile-form';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'تعديل الملف الشخصي — Chof Khdemti' };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const [userRes, profileRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, full_name, account_type')
      .eq('id', authUser.id)
      .single(),
    supabase
      .from('profiles')
      .select('bio, city, craft_category, years_experience, avatar_url, cover_url')
      .eq('user_id', authUser.id)
      .single(),
  ]);

  if (!userRes.data || !profileRes.data) redirect('/feed');

  const { username, full_name, account_type } = userRes.data;
  const { bio, city, craft_category, years_experience, avatar_url, cover_url } =
    profileRes.data;

  const defaultValues = {
    full_name,
    bio: bio ?? '',
    city: city ?? '',
    craft_category: craft_category ?? '',
    years_experience: years_experience ?? null,
    avatar_url: avatar_url ?? null,
    cover_url: cover_url ?? null,
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">تعديل الملف الشخصي</h1>
      <EditProfileForm
        defaultValues={defaultValues}
        accountType={account_type}
        username={username}
      />
    </main>
  );
}
