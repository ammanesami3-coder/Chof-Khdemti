import { redirect } from 'next/navigation';
import { EditProfileForm } from './edit-profile-form';
import { BackButton } from '@/components/shared/back-button';
import { PageTitle } from '@/components/shared/page-title';
import { requireUser } from '@/lib/supabase/require-user';

export const metadata = { title: 'تعديل الملف الشخصي — Chof Khdemti' };

export default async function EditProfilePage() {
  const { supabase, user: authUser } = await requireUser();

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

  if (!userRes.data || !profileRes.data) redirect('/');

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
      <div className="mb-6 flex items-center gap-2">
        <BackButton fallback={`/profile/${username}`} />
        <PageTitle tKey="editProfileBtn" />
      </div>
      <EditProfileForm
        defaultValues={defaultValues}
        accountType={account_type}
        username={username}
      />
    </main>
  );
}
