'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const artisanSchema = z.object({
  account_type: z.literal('artisan'),
  craft_category: z.string().min(1, 'اختر تخصصك'),
  city: z.string().min(1, 'اختر مدينتك'),
  years_experience: z.coerce
    .number()
    .min(0, 'القيمة يجب أن تكون 0 أو أكثر')
    .max(50, 'القيمة يجب أن تكون 50 أو أقل'),
  bio: z
    .string()
    .min(10, 'النبذة قصيرة جداً (10 أحرف على الأقل)')
    .max(300, 'النبذة طويلة جداً (300 حرف كحد أقصى)'),
});

const customerSchema = z.object({
  account_type: z.literal('customer'),
  city: z.string().min(1, 'اختر مدينتك'),
  bio: z.string().max(200, 'النبذة طويلة جداً (200 حرف كحد أقصى)').optional(),
});

const onboardingSchema = z.discriminatedUnion('account_type', [
  artisanSchema,
  customerSchema,
]);

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(
  input: OnboardingInput,
): Promise<{ success?: true; error?: string }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? 'بيانات غير صالحة' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { account_type, city, bio } = parsed.data;

  // تحديث نوع الحساب في جدول users
  const { error: userError } = await supabase
    .from('users')
    .update({ account_type, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (userError) return { error: `خطأ في تحديث بيانات المستخدم: ${userError.message}` };

  // تحديث ملف الحرفي الشخصي
  const isArtisan = parsed.data.account_type === 'artisan';

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      city,
      bio: bio ?? null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
      craft_category: isArtisan ? (parsed.data as { craft_category: string }).craft_category : null,
      years_experience: isArtisan ? (parsed.data as { years_experience: number }).years_experience : null,
    })
    .eq('user_id', user.id);

  if (profileError) return { error: `خطأ في تحديث الملف الشخصي: ${profileError.message}` };

  revalidatePath('/feed');
  return { success: true };
}
