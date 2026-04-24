import { NextResponse } from 'next/server';
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@/lib/supabase/server';
import { setupLS } from '@/lib/lemon-squeezy';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('lemon_subscription_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.lemon_subscription_id) {
    return NextResponse.json({ error: 'لا يوجد اشتراك نشط' }, { status: 404 });
  }

  setupLS();

  const { data, error } = await getSubscription(sub.lemon_subscription_id);

  if (error || !data?.data?.attributes?.urls?.customer_portal) {
    console.error('LS portal error:', error);
    return NextResponse.json({ error: 'خطأ في جلب بوابة الإدارة' }, { status: 500 });
  }

  return NextResponse.json({ url: data.data.attributes.urls.customer_portal });
}
