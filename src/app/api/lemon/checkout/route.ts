import { NextResponse } from 'next/server';
import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@/lib/supabase/server';
import { setupLS } from '@/lib/lemon-squeezy';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const [userRes, subRes] = await Promise.all([
    supabase.from('users').select('account_type, full_name').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
  ]);

  if (userRes.data?.account_type !== 'artisan') {
    return NextResponse.json({ error: 'هذه الخدمة للحرفيين فقط' }, { status: 403 });
  }

  if (subRes.data?.status === 'active') {
    return NextResponse.json({ error: 'لديك اشتراك نشط بالفعل' }, { status: 400 });
  }

  setupLS();

  const { data, error } = await createCheckout(
    process.env.LEMON_SQUEEZY_STORE_ID!,
    process.env.LEMON_SQUEEZY_VARIANT_ID!,
    {
      checkoutData: {
        email: user.email!,
        name: userRes.data!.full_name,
        custom: { user_id: user.id },
      },
      productOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?success=1`,
        receiptButtonText: 'العودة للمنصة',
        receiptThankYouNote: 'شكراً على اشتراكك في Chof Khdemti!',
      },
    },
  );

  if (error || !data?.data?.attributes?.url) {
    console.error('LS checkout error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء رابط الدفع' }, { status: 500 });
  }

  return NextResponse.json({ url: data.data.attributes.url });
}
