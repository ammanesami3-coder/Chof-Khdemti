import { NextResponse } from 'next/server';
import { cancelSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { setupLS } from '@/lib/lemon-squeezy';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  // RLS ensures user can only read their own subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('lemon_subscription_id, status, current_period_end')
    .eq('user_id', user.id)
    .single();

  if (!sub?.lemon_subscription_id) {
    return NextResponse.json({ error: 'لا يوجد اشتراك نشط' }, { status: 404 });
  }

  if (sub.status !== 'active') {
    return NextResponse.json({ error: 'الاشتراك غير نشط' }, { status: 400 });
  }

  setupLS();

  const { error } = await cancelSubscription(sub.lemon_subscription_id);

  if (error) {
    console.error('[cancel] LS error:', error);
    return NextResponse.json({ error: 'خطأ في إلغاء الاشتراك' }, { status: 500 });
  }

  // Mark immediately — the actual subscription_expired webhook fires at period end
  await supabaseAdmin
    .from('subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
