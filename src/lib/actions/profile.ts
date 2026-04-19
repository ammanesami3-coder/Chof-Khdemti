'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'الاسم قصير جداً').max(100, 'الاسم طويل جداً'),
  bio: z.string().max(300, 'النبذة طويلة جداً').optional(),
  city: z.string().optional(),
  craft_category: z.string().optional(),
  years_experience: z.number({ error: 'أدخل رقماً صحيحاً' }).min(0).max(50).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  cover_url: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfile(input: UpdateProfileInput): Promise<{ error?: string }> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'غير مصرح' };

  const { full_name, bio, city, craft_category, years_experience, avatar_url, cover_url } =
    parsed.data;

  const [usersRes, profilesRes] = await Promise.all([
    supabase
      .from('users')
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq('id', user.id),
    supabase
      .from('profiles')
      .update({
        bio: bio || null,
        city: city || null,
        craft_category: craft_category || null,
        years_experience: years_experience ?? null,
        avatar_url: avatar_url ?? null,
        cover_url: cover_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id),
  ]);

  if (usersRes.error) return { error: usersRes.error.message };
  if (profilesRes.error) return { error: profilesRes.error.message };
  return {};
}
