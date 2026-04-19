import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Hammer,
  Search,
  ShieldCheck,
  Star,
  ArrowLeft,
  UserPlus,
  FileText,
  ImageIcon,
  MessageCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Chof Khdemti — منصة الحرفيين المغاربة',
  description:
    'اكتشف أفضل الحرفيين في مدينتك، وشارك أعمالك مع آلاف الزبائن. منصة اجتماعية متخصصة للحرفيين في المغرب.',
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/feed');

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════ NAVBAR ══ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-red-700/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold text-white tracking-tight">
            Chof Khdemti
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:text-white"
            >
              دخول
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-opacity hover:opacity-90"
            >
              سجّل الآن
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════ HERO ════ */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-red-700 via-red-600 to-green-700 px-4 py-24 text-white sm:py-32">
        {/* Moroccan geometric SVG decoration */}
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
          <svg
            className="absolute -start-16 -top-16 h-96 w-96 text-white"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <MoroccanStar />
          </svg>
          <svg
            className="absolute -bottom-16 -end-16 h-96 w-96 rotate-45 text-white"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <MoroccanStar />
          </svg>
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="size-2 rounded-full bg-green-400" />
            منصة الحرفيين المغاربة
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            وصّل خدماتك لآلاف
            <br />
            <span className="text-green-300">الزبائن في المغرب</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80 sm:text-xl">
            اكتشف أفضل الحرفيين في مدينتك، وشارك أعمالك مع آلاف الزبائن.
            منصة اجتماعية متخصصة للحرفيين وأصحاب الخدمات.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-8 py-3 text-base font-semibold text-red-700 shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              <Hammer className="size-5" />
              سجّل كحرفي — 5 محادثات مجانية
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <Search className="size-5" />
              ابحث عن حرفي
              <ArrowLeft className="size-4" />
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-10 text-sm text-white/60">
            انضم لآلاف الحرفيين والزبائن في المغرب
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FEATURES ═ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">لماذا Chof Khdemti؟</h2>
            <p className="mt-3 text-muted-foreground">كل ما تحتاجه في مكان واحد</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <FeatureCard
              icon={<Hammer className="size-7 text-red-600" />}
              title="لكل الحرفيين"
              description="اشترك بـ 99 درهم/شهر ووصّل خدماتك لآلاف الزبائن. 5 محادثات مجانية للتجربة."
              bg="bg-red-50 dark:bg-red-950/20"
              iconBg="bg-red-100 dark:bg-red-900/30"
            />
            <FeatureCard
              icon={<Search className="size-7 text-green-600" />}
              title="لكل الزبائن"
              description="ابحث مجاناً عن حرفي موثوق في مدينتك. فلتر بالتخصص والمدينة والتقييم."
              bg="bg-green-50 dark:bg-green-950/20"
              iconBg="bg-green-100 dark:bg-green-900/30"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-7 text-blue-600" />}
              title="موثوق ومعتمد"
              description="تقييمات حقيقية من زبائن حقيقيين. ملفات شخصية مفصّلة لكل حرفي."
              bg="bg-blue-50 dark:bg-blue-950/20"
              iconBg="bg-blue-100 dark:bg-blue-900/30"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ HOW IT WORKS */}
      <section className="bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">كيف تبدأ؟</h2>
            <p className="mt-3 text-muted-foreground">أربع خطوات وتصبح جاهزاً</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              number="1"
              icon={<UserPlus className="size-6" />}
              title="سجّل حسابك"
              description="أنشئ حساباً مجانياً في أقل من دقيقة"
            />
            <Step
              number="2"
              icon={<FileText className="size-6" />}
              title="أكمل ملفك"
              description="أضف تخصصك ومدينتك وسنوات خبرتك"
            />
            <Step
              number="3"
              icon={<ImageIcon className="size-6" />}
              title="انشر أعمالك"
              description="شارك صور وفيديوهات أفضل أعمالك"
            />
            <Step
              number="4"
              icon={<MessageCircle className="size-6" />}
              title="استقبل طلبات"
              description="تواصل مع الزبائن مباشرة عبر المنصة"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ TESTIMONIALS */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">ماذا يقولون؟</h2>
            <p className="mt-3 text-muted-foreground">تجارب حقيقية من حرفيين وزبائن</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <TestimonialCard
              quote="الاشتراك في Chof Khdemti غيّر حياتي المهنية. الآن عندي زبائن جدد كل أسبوع."
              name="محمد العلوي"
              role="كهربائي — الرباط"
              stars={5}
            />
            <TestimonialCard
              quote="لقيت أحسن نجار في الدار البيضاء عبر المنصة. الخدمة ممتازة والتواصل سهل."
              name="فاطمة الزهراء"
              role="زبونة — الدار البيضاء"
              stars={5}
            />
            <TestimonialCard
              quote="أول زبون جاء من Chof Khdemti دفع لي أحسن من أي منصة أخرى جربتها."
              name="كريم بنعلي"
              role="نجار — مراكش"
              stars={5}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FINAL CTA ═ */}
      <section className="bg-gradient-to-bl from-red-700 via-red-600 to-green-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">جاهز تبدأ؟</h2>
          <p className="mt-4 text-lg text-white/80">
            انضم الآن واستفد من 5 محادثات مجانية مع الزبائن
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-10 py-3 text-base font-semibold text-red-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            سجّل الآن — مجاناً
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FOOTER ════ */}
      <footer className="border-t border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div className="max-w-xs">
              <p className="text-xl font-bold">Chof Khdemti</p>
              <p className="mt-2 text-sm text-muted-foreground">
                منصة اجتماعية متخصصة للحرفيين وأصحاب الخدمات في المغرب والعالم العربي.
              </p>
              {/* Social */}
              <div className="mt-4 flex gap-3">
                {['ف', 'إ', 'تـ'].map((label, i) => (
                  <span
                    key={i}
                    className="flex size-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground cursor-pointer"
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-8 sm:gap-16">
              <nav className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  المنصة
                </p>
                {['عن المنصة', 'الأسعار', 'الميزات'].map((label) => (
                  <p
                    key={label}
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    {label}
                  </p>
                ))}
              </nav>
              <nav className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  قانوني
                </p>
                {['سياسة الخصوصية', 'شروط الاستخدام', 'تواصل معنا'].map((label) => (
                  <p
                    key={label}
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    {label}
                  </p>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Chof Khdemti. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MoroccanStar() {
  return (
    <g fill="currentColor">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x = 100 + 80 * Math.cos(angle);
        const y = 100 + 80 * Math.sin(angle);
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="12"
            ry="40"
            transform={`rotate(${i * 45}, ${x}, ${y})`}
            opacity="0.6"
          />
        );
      })}
      <circle cx="100" cy="100" r="20" />
    </g>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  bg,
  iconBg,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bg: string;
  iconBg: string;
}) {
  return (
    <div className={`rounded-2xl p-6 ${bg}`}>
      <div className={`mb-4 inline-flex rounded-xl p-3 ${iconBg}`}>{icon}</div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30">
          {icon}
        </div>
        <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
          {number}
        </span>
      </div>
      <h3 className="mb-1 font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
  stars,
}: {
  quote: string;
  name: string;
  role: string;
  stars: number;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex gap-0.5">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">"{quote}"</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
