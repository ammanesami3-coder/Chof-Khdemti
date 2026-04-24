import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Gift, CheckCircle, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionActions } from '@/components/subscription/subscription-actions';
import { SuccessToast } from '@/components/subscription/success-toast';
import { SUBSCRIPTION_PRICE_DISPLAY, TRIAL_DURATION_DAYS } from '@/lib/constants/subscription';
import type { SubscriptionStatus } from '@/types/subscription';
import { cn } from '@/lib/utils';

export const metadata = { title: 'الاشتراك — Chof Khdemti' };

// ── Hero config ────────────────────────────────────────────────────────────
type HeroCfg = {
  gradient: string;
  border: string;
  iconBg: string;
  Icon: React.ElementType;
  iconColor: string;
  titleColor: string;
};

const HERO: Record<SubscriptionStatus, HeroCfg> = {
  trial: {
    gradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    Icon: Gift,
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
  },
  trial_ended: {
    gradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    Icon: Lock,
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-300',
  },
  active: {
    gradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    Icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-300',
  },
  past_due: {
    gradient: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    Icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-800 dark:text-amber-300',
  },
  cancelled: {
    gradient: 'from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/20',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    Icon: XCircle,
    iconColor: 'text-slate-500 dark:text-slate-400',
    titleColor: 'text-slate-700 dark:text-slate-300',
  },
};

// ── FAQ ────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'ماذا يحدث إذا لم أشترك بعد الشهر الأول؟',
    a: 'تستمر في قراءة رسائل الزبائن لكن لا تستطيع الرد عليها. اشترك في أي وقت للعودة إلى كامل الصلاحيات.',
  },
  {
    q: 'هل يمكنني الإلغاء متى شئت؟',
    a: 'نعم، الإلغاء فوري والوصول الكامل يستمر حتى نهاية الفترة المدفوعة بدون أي رسوم إضافية.',
  },
  {
    q: 'ما وسائل الدفع المقبولة؟',
    a: 'Visa, Mastercard، وبطاقات مغربية عبر بوابة Lemon Squeezy الآمنة.',
  },
  {
    q: 'هل تصلني فاتورة بعد كل دفعة؟',
    a: 'نعم، تصلك فاتورة تفصيلية على بريدك الإلكتروني بعد كل دفعة تلقائياً.',
  },
  {
    q: 'هل بيانات دفعي آمنة؟',
    a: 'نعم بالكامل. لا نحتفظ بأي بيانات بطاقة. كل شيء يمر عبر Lemon Squeezy المعتمدة لمعايير PCI DSS.',
  },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [userRes, subRes] = await Promise.all([
    supabase.from('users').select('account_type').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  // Customers don't pay — show simple message
  if (userRes.data?.account_type !== 'artisan') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-lg font-medium">الاشتراك مخصص للحرفيين فقط</p>
        <p className="mt-2 text-sm text-muted-foreground">
          الزبائن يستخدمون Chof Khdemti مجاناً بالكامل — لا يوجد اشتراك مطلوب.
        </p>
      </main>
    );
  }

  const sub = subRes.data;
  const status: SubscriptionStatus = sub?.status ?? 'trial';
  const cfg = HERO[status];

  // Compute derived values
  const daysLeft =
    sub?.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86_400_000))
      : 0;
  const trialProgress = Math.min(
    100,
    Math.round(((TRIAL_DURATION_DAYS - daysLeft) / TRIAL_DURATION_DAYS) * 100),
  );
  const periodEnd =
    sub?.current_period_end
      ? format(new Date(sub.current_period_end), 'd MMMM yyyy', { locale: ar })
      : null;
  const canManage = !!sub?.lemon_subscription_id;

  // Hero title & subtitle
  let heroTitle = '';
  let heroSubtitle = '';

  if (status === 'trial') {
    heroTitle = `تجربة مجانية — ${daysLeft} يوم متبقي`;
    heroSubtitle = `استمتع بكل مميزات المنصة مجاناً لمدة ${TRIAL_DURATION_DAYS} يوماً`;
  } else if (status === 'trial_ended') {
    heroTitle = 'انتهت تجربتك — اشترك للاستمرار';
    heroSubtitle = 'لا تفوّت أي رسالة من زبائنك';
  } else if (status === 'active') {
    heroTitle = 'اشتراك نشط';
    heroSubtitle = periodEnd ? `مجدّد حتى ${periodEnd}` : 'اشتراكك فعّال';
  } else if (status === 'past_due') {
    heroTitle = 'فشل الدفع — حدّث طريقة الدفع';
    heroSubtitle = 'لديك مهلة 3 أيام لتحديث معلومات بطاقتك';
  } else {
    heroTitle = 'اشتراكك ملغى';
    heroSubtitle = 'اشترك مجدداً للرد على رسائل زبائنك';
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      {/* Success toast (useSearchParams requires Suspense) */}
      <Suspense>
        <SuccessToast />
      </Suspense>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الاشتراك</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUBSCRIPTION_PRICE_DISPLAY} — الاشتراك الشهري لـ Chof Khdemti
        </p>
      </div>

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm',
          cfg.gradient,
          cfg.border,
        )}
      >
        {/* Top stripe */}
        <div className="h-1 bg-gradient-to-l from-red-600 to-green-600" />

        <div className="p-6">
          {/* Icon + title */}
          <div className="mb-4 flex items-center gap-3">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', cfg.iconBg)}>
              <cfg.Icon className={cn('h-6 w-6', cfg.iconColor)} />
            </div>
            <div>
              <h2 className={cn('text-lg font-bold leading-snug', cfg.titleColor)}>
                {heroTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{heroSubtitle}</p>
            </div>
          </div>

          {/* Progress bar — trial only */}
          {status === 'trial' && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>اليوم 1</span>
                <span>اليوم {TRIAL_DURATION_DAYS}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-red-500 to-green-600 transition-all"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {TRIAL_DURATION_DAYS - daysLeft} يوم من أصل {TRIAL_DURATION_DAYS}
              </p>
            </div>
          )}

          {/* CTA button */}
          <SubscriptionActions status={status} canManage={canManage} />
        </div>
      </div>

      {/* ── Plan details ───────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold">ما يشمله الاشتراك</h3>
        <ul className="space-y-3">
          {[
            'محادثات غير محدودة مع الزبائن',
            'الرد الفوري على كل الرسائل',
            'ملف شخصي احترافي وسمعة رقمية',
            'ظهور في نتائج البحث والاكتشاف',
            'دعم فني مخصص',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <svg viewBox="0 0 12 12" className="h-3 w-3 stroke-current stroke-2 fill-none">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">أسئلة شائعة</h3>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-xl border bg-card p-4">
              <p className="font-medium leading-snug">{q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
