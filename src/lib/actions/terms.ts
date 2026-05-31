'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Records the current user's acceptance of the Terms & Privacy Policy by
 * stamping profiles.terms_accepted_at. Used by the /auth/accept-terms gate
 * that forces pre-existing users to accept the updated terms on next login.
 */
export async function acceptTerms(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  // terms_accepted_at is not in the generated types yet — cast to bypass.
  // RLS (profiles_update_own) already scopes the write to the caller's row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/');
  return {};
}
