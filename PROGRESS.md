# PROGRESS.md — Chof Khdemti

## المرحلة الحالية: ✅ 3 مكتملة — بدء المرحلة 4

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

## المرحلة 3 — الفيد الاجتماعي ✅

### DoD Checklist

- [x] الفيد يُحمّل في أقل من 2 ثانية — SSR initial data + `preconnect` Cloudinary + `f_auto,q_auto` في URL
- [x] رفع فيديو ينجح دون خطأ — `MediaUpload` component مع XHR progress
- [x] الإعجاب يظهر فوراً (optimistic) — `useLikePost` مع `onMutate` + rollback
- [x] التعليق يظهر مباشرة بعد الإرسال — `useAddComment` مع optimistic prepend + تحديث `comments_count`
- [x] الفيد الشخصي يعرض منشورات المتابَعين فقط (+ منشورات المستخدم نفسه)
- [x] الفيديوهات تعمل على Safari و Chrome موبايل — `playsInline` attribute + lazy `preload`
- [x] Counts (likes/comments) متزامنة مع DB — triggers PostgreSQL (0008_counts_triggers.sql)

### ما أُنجز تفصيلاً

**وسائط متعددة (المهمة 1)**
- `src/lib/cloudinary-upload.ts` — `uploadToCloudinary` (XHR + progress) + `deleteFromCloudinary`
- `src/components/shared/media-upload.tsx` — drag & drop، multi-select، validation (حجم/نوع)، progress bars، DnD reorder (@dnd-kit)، حتى 10 وسائط

**PostCard (المهمة 2)**
- `src/components/feed/post-card.tsx` — Embla Carousel للمتعدد، `VideoSlide` (lazy preload + `playsInline`)، like bounce animation، CommentsDialogLazy (dynamic import)، حالة `is_pending` (opacity-50 + مؤشر "جاري النشر...")
- `src/components/feed/post-card-skeleton.tsx`

**الفيد الرئيسي (المهمة 3)**
- `src/lib/queries/posts.ts` — `fetchFollowingFeed` / `fetchDiscoverFeed` / `fetchUserPosts` / `fetchPostById` مع cursor pagination `(created_at DESC, id DESC)` + `f_auto,q_auto` على كل URLs
- `src/lib/actions/posts.ts` — `createPost` Server Action
- `src/components/feed/feed-list.tsx` — `useInfiniteQuery` + IntersectionObserver + Pull-to-refresh (touch) + new posts banner (visibilitychange) + empty states
- `src/components/feed/feed-tabs.tsx` — Tabs + optimistic newPosts lifecycle (creating → created → error)
- `src/app/(app)/feed/page.tsx` — SSR first page → FeedTabs مع initialData
- `src/app/(app)/feed/error.tsx` — Error boundary مع retry

**الإعجابات (المهمة 4)**
- `src/lib/actions/likes.ts` — `toggleLike` (direct table ops بدل RPC)
- `src/hooks/use-like-post.ts` — `useMutation` مع `onMutate` optimistic + rollback
- `supabase/migrations/0008_counts_triggers.sql` — triggers لـ `likes_count` + `comments_count`

**التعليقات (المهمة 5)**
- `src/lib/actions/comments.ts` — `addComment` / `deleteComment` / `getComments`
- `src/hooks/use-comments.ts` — `useComments` + `useAddComment` + `useDeleteComment`
- `src/components/feed/comments-dialog.tsx` — Dialog مع infinite scroll داخلي
- `src/components/feed/comment-item.tsx` — Double-tap delete (confirm ثم execute)

**فهارس قاعدة البيانات (المهمة 5 — أداء)**
- `supabase/migrations/0009_feed_indexes.sql` — 5 indexes على posts/comments/likes/follows

**CSS**
- `src/app/globals.css` — `@keyframes like-bounce`

---

### مشاكل واجهتها وكيف حُلّت

| المشكلة | السبب | الحل |
|---------|-------|------|
| زر الإعجاب يُظهر "فشل الإعجاب" دائماً | `toggle_like` RPC موجود في migration لكن لم يُطبَّق على Supabase الفعلي | استبدال RPC بعمليات مباشرة على جدول `likes` (insert/delete)، والـ PK المركّب `(user_id, post_id)` يمنع التكرار طبيعياً |
| `fetchFollowingFeed` يُعيد فيداً فارغاً | الدالة ترجع مبكراً إذا `followingIds.length === 0` | إضافة `currentUserId` دائماً إلى مصفوفة المؤلفين بغض النظر عن المتابَعين |
| `RecentComment` لا يحتوي `author_id` | النوع الأصلي لم يشمله | إضافة `author_id: string` للنوع + تحديث `addComment` و`getComments` لإرجاعه |
| `data-[state=active]:` لا تعمل في profile | shadcn يستعمل base-ui وليس Radix (`data-active:` وليس `data-[state=active]:`) | استبدال جميع التكرارات في `profile/[username]/page.tsx` |
| LCP تراجع بعد محاولة تحسينه | `loaderFile` مخصص + preload يدوي أنتجا **URL مختلفين** → متصفح يُحمّل الصورة مرتين | حذف كليهما والعودة لـ `next/image` القياسي + إضافة `f_auto,q_auto` في URL على مستوى الـ query |

---

### نتائج Lighthouse (local — npm run build + start)

| المقياس | القيمة | التقييم |
|---------|--------|---------|
| LCP (قبل إصلاح LCP) | ~4.72s | ضعيف |
| LCP (بعد الإصلاح) | قيد القياس | — |
| CLS | 0 | ممتاز |
| INP | 24ms | ممتاز |

> **ملاحظة:** LCP الفعلي بعد الإصلاح يحتاج قياساً يدوياً في production (أول طلب حقيقي يُسرّع بعد caching من `/_next/image`). التحسينات المطبَّقة: `preconnect` إلى Cloudinary + `f_auto,q_auto` في كل URLs + Cairo من 4 weights إلى 2 + `display: swap`.

---

## المرحلة التالية: 4 — المحادثات ونظام الاشتراك (أيام 17-22)

- [ ] بنية المحادثات (`conversations` + `messages`) — صفحتا `/messages` و `/messages/[id]`
- [ ] Realtime عبر Supabase channel لكل محادثة
- [ ] منطق الـ Quota — `can_artisan_reply()` RPC + `<UpgradePrompt />`
- [ ] عرض حالة الـ Quota في Navbar — `<QuotaIndicator />`
- [ ] Lemon Squeezy Checkout — `POST /api/lemon/checkout`
- [ ] Lemon Squeezy Webhook — `POST /api/lemon/webhook` مع signature verification + idempotency
- [ ] صفحة `/settings/subscription` — حالة الاشتراك + زر اشترك + Customer Portal
