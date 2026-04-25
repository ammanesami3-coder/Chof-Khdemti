'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ratingSchema } from '@/lib/validations/rating';
import type { Rating } from '@/lib/validations/rating';

export async function submitRating(input: {
  artisanId: string;
  stars: number;
  comment?: string;
}): Promise<{ data: Rating; error?: never } | { error: string; data?: never }> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' };

  const { artisanId, stars, comment } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  // الزبون فقط يُقيّم
  const { data: me } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', user.id)
    .single();

  if (!me || me.account_type !== 'customer') {
    return { error: 'الحرفيون لا يستطيعون تقييم بعضهم' };
  }

  // التحقق: هل تواصل الزبون مع هذا الحرفي؟
  const { data: canRate } = await supabase.rpc('can_customer_rate', {
    p_artisan_id: artisanId,
    p_customer_id: user.id,
  });

  if (!canRate) {
    return { error: 'يجب أن تكون قد راسلت هذا الحرفي أولاً' };
  }

  // UPSERT: insert إذا جديد، update إذا موجود
  const { data: rating, error: upsertErr } = await supabase
    .from('ratings')
    .upsert(
      {
        artisan_id: artisanId,
        customer_id: user.id,
        stars,
        comment: comment?.trim() || null,
      },
      { onConflict: 'artisan_id,customer_id' },
    )
    .select('id, artisan_id, customer_id, stars, comment, created_at, updated_at')
    .single();

  if (upsertErr || !rating) {
    return { error: upsertErr?.message ?? 'خطأ في الحفظ' };
  }

  // revalidate ملف الحرفي
  const { data: artisan } = await supabase
    .from('users')
    .select('username')
    .eq('id', artisanId)
    .single();

  if (artisan?.username) {
    revalidatePath(`/profile/${artisan.username}`);
  }

  return { data: rating as Rating };
}

export async function deleteRating(/* ratingId: string */): Promise<{ error: string }> {
  // الحذف ممنوع حسب CLAUDE.md — حفاظاً على السمعة
  return { error: 'حذف التقييمات غير مسموح به' };
}
