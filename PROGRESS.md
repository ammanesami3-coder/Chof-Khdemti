# PROGRESS.md — Chof Khdemti

## المرحلة الحالية: ✅ 2 مكتملة — بدء المرحلة 3

---

## المرحلة 1 — الأساس والبنية التحتية ✅

- [x] هيكل المشروع (Next.js 15, TypeScript strict, Tailwind, shadcn/ui)
- [x] RTL + `dir="rtl"` + `lang="ar"` في layout
- [x] Supabase client (browser + server + middleware)
- [x] Middleware — حماية المسارات + refresh session + onboarding redirect
- [x] قاعدة البيانات — 12 جدول مع RLS مفعّل
  - 0001_initial_schema.sql / 0002_rls_policies.sql / 0003_functions.sql
  - 0004_subscriptions.sql / 0005_auth_trigger.sql
- [x] صفحات `/signup` و `/login` و `/logout`
- [x] إنشاء rows في `users` + `profiles` + `subscriptions` بعد التسجيل
- [x] `.env.example` مكتمل

---

## المرحلة 2 — ملفات المستخدمين والاكتشاف ✅

### DoD Checklist

- [x] الحرفي يكمل Onboarding في أقل من دقيقتين — نموذج خطوتين (نوع الحساب ← التفاصيل)
- [x] الملف الشخصي يظهر صحيحاً على موبايل وديسكتوب (RTL) — `/profile/[username]`
- [x] البحث في `/explore` يُعيد نتائج — فلاتر + debounce 300ms + URL params
- [x] رفع avatar/cover ينجح ويظهر فوراً — Cloudinary signed upload
- [x] الزبون لا يرى خيار إضافة تخصص مهني — مشروط بـ `account_type`
- [x] فلتر التخصص + المدينة يعملان معاً بدقة
- [x] زر "متابعة" يعمل مع optimistic update + rollback عند الخطأ
- [x] URL الملف الشخصي مبني على username وليس UUID

### ما أُنجز تفصيلاً

**Onboarding** — `0006_onboarding_complete.sql`، صفحة `/onboarding` بخطوتين مع progress bar، middleware redirect

**الملف الشخصي** — `ProfileHeader` (cover + avatar overlap + verified badge + craft badge + rating)، `ProfileStats`، Tabs (أعمال/عن/تقييمات)، `/profile/edit`

**Cloudinary** — `POST /api/cloudinary/sign` (توقيع آمن)، `ImageUpload` component
> **ملاحظة:** استعملنا Cloudinary signed uploads مباشرةً بدل next-cloudinary Widget للتحكم الكامل في الـ UX وتجنب إضافة مكتبة > 100KB

**Follow** — `followUser` / `unfollowUser` Server Actions، `useFollow` hook مع optimistic update

**Explore** — `ExploreFilters` (dropdowns + search debounce + URL params)، `ArtisanCard` + `ArtisanGrid` (1/2/3 أعمدة + skeleton + empty state)، `useInfiniteQuery` + زر "تحميل المزيد"، `0007_indexes.sql`

> **إصلاح مهم في الـ query:** استعمال `ratings!ratings_artisan_id_fkey` بدل `ratings` لتجنب FK ambiguity (ratings لها FK مزدوج نحو users عبر artisan_id وcustomer_id)

**Landing Page** — Server Component خالص (Hero + Features + How it works + Testimonials + CTA + Footer)، redirect تلقائي للمستخدمين المسجّلين

**Infrastructure** — `Providers` (QueryClientProvider)، `useProfile` hook، `next.config.ts` (Cloudinary hostname)

---

## المرحلة التالية: 3 — الفيد الاجتماعي (أيام 10-16)

- [ ] رفع وسائط متعددة عبر Cloudinary (صور + فيديو، حتى 10 في المنشور)
- [ ] نموذج المنشور الجديد مع preview وإعادة الترتيب
- [ ] الفيد الرئيسي `/feed` — منشورات المتابَعين + Infinite Scroll
- [ ] الإعجاب (Like) — Optimistic update + rollback
- [ ] التعليقات — Modal/inline + optimistic
- [ ] فيد الاكتشاف (Tab ثانٍ في /feed)
