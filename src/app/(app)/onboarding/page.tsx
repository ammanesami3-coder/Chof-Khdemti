import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('user_id', user.id)
    .single();

  if (profile?.onboarding_complete) redirect('/feed');

  const { data: userData } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <OnboardingForm defaultAccountType={userData?.account_type ?? null} />
    </div>
  );
}
