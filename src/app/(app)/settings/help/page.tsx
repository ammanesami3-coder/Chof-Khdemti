'use client';

import { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Wrench,
  Mail,
  MessageSquare,
  Users,
  Zap,
  Star,
  Shield,
  X,
} from 'lucide-react';
import { BackButton } from '@/components/shared/back-button';

// ── FAQ data ──────────────────────────────────────────────────────────────────

type FaqItem = {
  q: string;
  a: string;
  tags: string[];
};

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'ما هي منصة Chof Khdemti؟',
    a: 'Chof Khdemti هي منصة اجتماعية متخصصة للحرفيين وأصحاب الخدمات في المغرب والعالم العربي. تمكّن الحرفيين من نشر أعمالهم، بناء ملف احترافي، واستقبال طلبات الزبائن.',
    tags: ['منصة', 'عام', 'ما هي'],
  },
  {
    q: 'من يمكنه استخدام المنصة؟',
    a: 'المنصة مفتوحة لنوعين من الحسابات: الحرفيون (مقدمو الخدمات) والزبائن. يمكن للزبائن التصفح مجاناً، بينما يحتاج الحرفيون إلى اشتراك شهري بعد انتهاء فترة التجربة.',
    tags: ['حسابات', 'زبون', 'حرفي', 'استخدام'],
  },
  {
    q: 'كيف أنشئ منشوراً؟',
    a: 'اضغط على زر "+" في الشريط السفلي أو من الصفحة الرئيسية. يمكنك إضافة صور وفيديوهات (حتى 10 وسائط) مع نص تعريفي. المنشورات ستظهر في ملفك الشخصي وفي فيد متابعيك.',
    tags: ['نشر', 'منشور', 'صور', 'فيديو'],
  },
  {
    q: 'كيف أتواصل مع حرفي؟',
    a: 'افتح ملف الحرفي واضغط على زر "رسالة". سيتم إنشاء محادثة مباشرة بينكما. الزبائن يرسلون مجاناً دائماً.',
    tags: ['رسائل', 'محادثة', 'تواصل'],
  },
  {
    q: 'كيف أبحث عن حرفي في مدينتي؟',
    a: 'انتقل إلى صفحة "الحرفيون" من الشريط السفلي. ستجد فلاتر البحث حسب التخصص والمدينة. يمكنك أيضاً البحث بالاسم مباشرة.',
    tags: ['بحث', 'اكتشاف', 'فلتر', 'مدينة'],
  },
  {
    q: 'ما هي فترة التجربة المجانية للحرفيين؟',
    a: 'كل حرفي جديد يحصل على 30 يوماً مجانية كاملة من تاريخ التسجيل. خلال هذه الفترة يمكنه الرد على جميع رسائل الزبائن بدون أي قيد.',
    tags: ['تجربة', 'مجاني', '30 يوم', 'حرفي'],
  },
  {
    q: 'كم سعر الاشتراك للحرفيين؟',
    a: 'سعر الاشتراك هو 99 درهم مغربي في الشهر. يمكن الدفع ببطاقة Visa أو Mastercard أو بطاقات البنوك المغربية.',
    tags: ['سعر', 'اشتراك', '99', 'درهم', 'دفع'],
  },
  {
    q: 'ماذا يحدث بعد انتهاء فترة التجربة؟',
    a: 'بعد انتهاء الـ 30 يوماً وبدون اشتراك، يصبح الحرفي في وضع "قراءة فقط": يمكنه قراءة رسائل الزبائن لكن لا يستطيع الرد عليها. يمكن الاشتراك في أي وقت لاستعادة كامل الصلاحيات.',
    tags: ['انتهاء', 'تجربة', 'قراءة', 'رد'],
  },
  {
    q: 'هل يمكن إلغاء الاشتراك؟',
    a: 'نعم، يمكن إلغاء الاشتراك في أي وقت من صفحة "إدارة الاشتراك". ستستمر في الاستفادة من الخدمة حتى نهاية الفترة المدفوعة.',
    tags: ['إلغاء', 'اشتراك'],
  },
  {
    q: 'كيف أعدّل ملفي الشخصي؟',
    a: 'اذهب إلى الإعدادات → "تعديل الملف الشخصي". يمكنك تغيير الصورة الشخصية، صورة الغلاف، البيو، التخصص، والمدينة.',
    tags: ['ملف', 'تعديل', 'صورة', 'بيو'],
  },
  {
    q: 'هل يمكنني تقييم حرفي؟',
    a: 'نعم، يمكن للزبائن تقييم الحرفيين الذين تواصلوا معهم. التقييم من 1 إلى 5 نجوم مع تعليق اختياري. يمكن لكل زبون تقييم حرفي واحد مرة واحدة فقط.',
    tags: ['تقييم', 'نجوم', 'زبون'],
  },
  {
    q: 'كيف أبلغ عن حساب أو محتوى مسيء؟',
    a: 'اضغط على أيقونة "···" في أي منشور واختر "إبلاغ". سيتم مراجعة البلاغ من فريقنا خلال 24 ساعة.',
    tags: ['إبلاغ', 'بلاغ', 'مسيء'],
  },
];

// ── How it works ──────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: Users,
    title: 'أنشئ حسابك',
    desc: 'سجّل كحرفي أو زبون في أقل من دقيقتين',
    color: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Wrench,
    title: 'أكمل ملفك المهني',
    desc: 'أضف تخصصك ومدينتك وصورك للظهور في نتائج البحث',
    color: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-500 dark:text-orange-400',
  },
  {
    icon: Zap,
    title: 'انشر أعمالك',
    desc: 'شارك صوراً وفيديوهات لأعمالك مع المجتمع',
    color: 'bg-yellow-50 dark:bg-yellow-950/40',
    iconColor: 'text-yellow-600 dark:text-yellow-500',
  },
  {
    icon: MessageSquare,
    title: 'تواصل مع الزبائن',
    desc: 'استقبل رسائل الزبائن وردّ عليها مباشرة',
    color: 'bg-green-50 dark:bg-green-950/40',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    icon: Star,
    title: 'بنِ سمعتك',
    desc: 'اجمع التقييمات وارفع مستوى ظهورك في البحث',
    color: 'bg-purple-50 dark:bg-purple-950/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
];

// ── FaqAccordion ──────────────────────────────────────────────────────────────

function FaqAccordion({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/40"
      >
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary/70" />
        <p className="flex-1 text-sm font-medium leading-snug">{item.q}</p>
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('');

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <h1 className="text-2xl font-bold">مركز المساعدة</h1>
      </div>

      {/* Hero search */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 border border-primary/20">
        <p className="mb-3 text-sm font-medium text-foreground/80">
          كيف يمكننا مساعدتك؟
        </p>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المساعدة..."
            className="w-full rounded-xl border border-border/60 bg-background py-2.5 ps-9 pe-9 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* How it works — hidden when searching */}
      {!query && (
        <section className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            كيف تعمل المنصة
          </h2>
          <div className="space-y-2">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${step.color}`}
                >
                  <step.icon className={`size-[18px] ${step.iconColor}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {query ? `نتائج البحث (${filteredFaq.length})` : 'الأسئلة الشائعة'}
        </h2>
        {filteredFaq.length > 0 ? (
          <div className="space-y-2">
            {filteredFaq.map((item, i) => (
              <FaqAccordion key={i} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card py-10 text-center shadow-sm">
            <Search className="size-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              لا توجد نتائج لـ &quot;{query}&quot;
            </p>
            <p className="text-xs text-muted-foreground/60">
              جرّب كلمات بحث مختلفة أو تصفّح الأسئلة أدناه
            </p>
          </div>
        )}
      </section>

      {/* Contact Support */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          التواصل مع الدعم
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/40">
          <a
            href="mailto:support@chofdkhdemti.ma"
            className="group flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-muted/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 transition-transform group-hover:scale-105">
              <Mail className="size-5 text-blue-600 dark:text-blue-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">البريد الإلكتروني</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                support@chofdkhdemti.ma
              </p>
            </div>
            <span className="text-xs font-medium text-primary">إرسال</span>
          </a>

          <a
            href="https://wa.me/212600000000"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-muted/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40 transition-transform group-hover:scale-105">
              <MessageSquare className="size-5 text-green-600 dark:text-green-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">واتساب</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                متاح من 9:00 صباحاً إلى 6:00 مساءً
              </p>
            </div>
            <span className="text-xs font-medium text-green-600">فتح</span>
          </a>
        </div>
      </section>

      {/* Report an issue */}
      <section className="mb-6">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          الإبلاغ عن مشكلة
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/40">
              <Shield className="size-5 text-red-500 dark:text-red-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">هل واجهتَ مشكلة؟</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                إذا وجدت محتوى مسيئاً أو سلوكاً غير لائق، يمكنك الإبلاغ مباشرة
                من أي منشور أو حساب باستخدام زر الخيارات &ldquo;···&rdquo;.
              </p>
            </div>
          </div>
          <a
            href="mailto:report@chofdkhdemti.ma?subject=بلاغ عن مشكلة"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <Shield className="size-4" />
            أبلغ عن مشكلة
          </a>
        </div>
      </section>

      {/* App version */}
      <div className="pb-4 text-center">
        <p className="text-xs text-muted-foreground/40">
          Chof Khdemti · الإصدار 1.0
        </p>
      </div>
    </main>
  );
}
