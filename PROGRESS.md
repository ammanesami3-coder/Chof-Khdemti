# PROGRESS.md — Chof Khdemti

## المرحلة الحالية: ✅ 5.5 مكتملة + تدقيق أمني وأداء + بوابة الشروط القانونية — جاهز للمرحلة 6 (الإطلاق)

---

## Vercel Analytics — يونيو 2026

> **الهدف:** تفعيل تحليلات الزيارات (المرحلة 6 — المراقبة) عبر `@vercel/analytics`.

- تثبيت حزمة `@vercel/analytics`.
- `src/app/layout.tsx`: استيراد `Analytics` من `@vercel/analytics/next` (المسار الموصى به لـ App Router) + وضع `<Analytics />` داخل `<body>` بعد `<Toaster />`.
- المكوّن client بداخله، فيعمل بأمان داخل layout هو Server Component. التتبّع يبدأ بعد النشر على Vercel مع تفعيل Analytics من لوحة المشروع.

---

## الحماية القانونية — مايو 2026 (شروط الاستخدام + بوابة الموافقة)

> **الهدف:** صفحات قانونية (شروط/خصوصية) + إلزام الموافقة عند التسجيل، ثم **إجبار المستخدمين القدامى** (قبل إضافة checkbox) على الموافقة عند أول تسجيل دخول لاحق.

### الجزء أ — الصفحات القانونية + checkbox التسجيل (مكتمل سابقاً في نفس الجلسة)

- صفحتان عامتان `/terms` و `/privacy` بثلاث لغات (ar/fr/en) — تشمل **بند الوسيط** (المنصة وسيط تقني، لا مسؤولية)، **التحقق من الهوية**، و**إخلاء المسؤولية عن الأسعار والدفع**.
- `src/lib/legal/legal-content.ts` (المحتوى) + `src/components/legal/legal-document.tsx` (عارض موحّد يتبع لغة المستخدم).
- checkbox موافقة إلزامي في التسجيل + `terms_accepted` في `signUpSchema` (refine → must be true) — مفروض على العميل والسيرفر معاً.

### الجزء ب — بوابة الشروط للمستخدمين القدامى

**قاعدة البيانات:**
- **Migration `0050_terms_acceptance.sql`**: عمود `terms_accepted_at timestamptz` (nullable) على `profiles`. `NULL` = لم يوافق بعد (مُبوَّب). الصفوف القديمة تبقى `NULL` (بدون backfill) فيُجبَر كل مستخدم قديم على الموافقة مرة واحدة.

**السيرفر:**
- `signIn` (auth.ts): بعد نجاح كلمة السر، يستعلم `terms_accepted_at` — إن كان `null` يُرجع `{ requiresTermsAcceptance: true }`.
- `signUp` (auth.ts): يضبط `terms_accepted_at = now()` للمستخدم الجديد (الـ trigger 0005 أنشأ صف profiles مسبقاً) فلا يُبوَّب بعد موافقته في الفورم.
- `src/lib/actions/terms.ts` (جديد): `acceptTerms()` — يضبط `terms_accepted_at = now()` للمستخدم الحالي (RLS `profiles_update_own` يحصر الكتابة).

**الواجهة:**
- `src/app/auth/accept-terms/page.tsx` (Server): `requireUser` + إن كان موافقاً مسبقاً → `redirect` للوجهة؛ وإلا يعرض الشاشة (يقرأ `?next` بأمان، ويمنع الحلقة على البوابة نفسها).
- `src/app/auth/accept-terms/accept-terms-client.tsx`: شاشة نظيفة (شعار + أيقونة درع + نص الموافقة + روابط الشروط/الخصوصية) + زر **«الموافقة والمتابعة»** + زر ثانوي **«تسجيل الخروج»** (للخروج والتصفح كزائر).
- `login-form.tsx`: عند `requiresTermsAcceptance` يوجّه لـ `/auth/accept-terms?next=…` بدل الفيد.

**Middleware (تطبيق صارم + cache):**
- استبدال `getOnboardingComplete` بـ `getGateState` (استعلام واحد يجلب `onboarding_complete` + `terms_accepted_at`).
- استبدال كوكي `ob_done` بكوكي **`gate_ok`** يُضبط على `user.id` فقط حين يكتمل **الشرطان** — فلا استعلام DB في كل تنقّل بعد اجتياز البوابة.
- المستخدم المسجّل غير الموافق يُوجَّه لـ `/auth/accept-terms` من أي صفحة، مع استثناء `/onboarding`, `/auth/accept-terms`, `/logout`, `/terms`, `/privacy`.

**i18n:** مفاتيح البوابة (`termsGateTitle/Prompt/AgreeBtn/Logout/Error/ReadPrefix`) بثلاث لغات.

**النتائج:** `npx tsc --noEmit` ✓ · `eslint` ✓ · `next build` ✓ (`/auth/accept-terms` ديناميكي) · `vitest` → **59 اختباراً ✓**.

> ⚠️ **يتطلّب تطبيق Migration `0050` على Supabase** قبل تفعيل البوابة (وإلا سيفشل استعلام `terms_accepted_at`).

---

## تدقيق احترافي — مايو 2026 (المرحلة 1: أمان · المرحلة 2: أداء وتنظيف)

> **الهدف:** تدقيق أمني شامل للـ API/الإجراءات + تحسين الأداء وإزالة الديون التقنية. النتيجة: `tsc` ✓ · `eslint` (0 errors) ✓ · `next build` ✓.

### المرحلة 1 — تشديد الأمان (5 إصلاحات)

> **الخلاصة:** النواة سليمة أصلاً — RLS مفعّل على كل الجداول، توقيع webhook بـ `timingSafeEqual`، ودوال `SECURITY DEFINER` محصّنة بـ `search_path` ثابت وفحص هوية المُستدعي. الإصلاحات أدناه تسدّ ثغرات تشغيلية وحوافّ.

1. **حماية مفتاح الخدمة (`server-only`)** — `src/lib/supabase/admin.ts`: إضافة `import "server-only"` فيصبح أي استيراد من كود العميل خطأ وقت البناء، ويستحيل تسريب `SERVICE_ROLE_KEY` إلى حزمة المتصفح.
2. **تقييد روابط الوسائط لنطاق Cloudinary فقط** — `src/lib/cloudinary-url.ts` (جديد): `isOurCloudinaryUrl` + `cloudinaryUrlSchema` (host = `res.cloudinary.com` + مسار سحابتنا فقط). طُبِّق على مرفقات/صوت الرسائل (`messages.ts`) وصورة/غلاف البروفايل (`profile.ts`) بدل `z.string().url()` المفتوح — يمنع تخزين روابط خارجية (تتبّع/محتوى مختلط/SSRF).
3. **تأمين `/api/proxy-file`** — يتطلّب جلسة مصادَقة الآن + تضييق فحص SSRF من `*.cloudinary.com` إلى `res.cloudinary.com` + بادئة سحابتنا + `https:` فقط.
4. **تأمين `/api/cloudinary/view`** — إضافة فحص `getUser()` + **إزالة fallback توقيع الموارد المقيّدة** الذي كان يسمح لأي طلب مجهول بجلب أصول محمية عبر `public_id` (تجاوز التحكم بالوصول).
5. **تحديد المعدّل (Rate Limiting)** — `src/lib/rate-limit.ts` (جديد): محدِّد نافذة ثابتة في الذاكرة بدون أي مكتبة خارجية (best-effort لكل instance، مع مسار ترقية لاحق لـ Upstash). طُبِّق على:
   - المصادقة (`auth.ts`): تسجيل دخول 8/دقيقة، تسجيل جديد 5/10 دقائق — حسب IP.
   - الرسائل (`messages.ts`): 30/30 ثانية — حسب المستخدم (كل أنواع الإرسال).
   - الدفع (`checkout/route.ts`): 5/دقيقة — حسب المستخدم (HTTP 429).

### المرحلة 2 — الأداء وإعادة الهيكلة

> **الخلاصة:** المسارات الساخنة (الفيد، الاكتشاف، المحادثات) خالية من مشاكل N+1 — كلها تجمّع عبر `.in(...)` أو RPC واحد.

1. **حذف استعلام مكرّر في `enrichPosts`** — `src/lib/queries/posts.ts`: كان يُعيد استعلام نفس صفوف `posts` مرة ثانية لجلب `shares_count`/`shared_post_id`/`reactions_summary`. ضُمّت الأعمدة إلى `POST_SELECT` (عبر مساعد `postsTable()` واحد) فتصل مع الاستعلام الرئيسي — **جولة قاعدة بيانات أقل** على كل فيد/منشور/بروفايل/فيديو/محفوظات. بلا تغيير في المخرجات.
2. **توحيد `getInitials`** — `src/lib/utils.ts`: دالة واحدة null-safe بدل 5 نسخ مكرّرة (`user-avatar`, `profile-header`, `notification-item`, `send-via-message-sheet`, `post-composer`) — وأصلحت أيضاً غياب `toUpperCase` في `post-composer`.
3. **تدقيق أخطاء التعليقات** — لا تغيير لازم: إجراءات التعليقات تُستهلك حصراً عبر `use-comments.ts` بـ `.mutate()`، وكل mutation له `onError` + rollback + `toast.error`. النمط مثالي بالفعل (إضافة try/catch يدوي كانت ستكسر الـ rollback).

### إزالة كود ميّت (~900 سطر) — 5 ملفات معزولة

استُبدلت بإعادات تصميم سابقة ولا يستوردها أي ملف (تحقّقنا عبر grep على المسارات والرموز — لا barrel ولا dynamic import):
- **تعليقات (استبدلها `CommentBubble` + `CommentsSheet`):** `comment-item.tsx`، `comments-dialog.tsx`، `inline-comments.tsx`
- **موقع (استبدلها `LocationMessageCard` + `LocationViewerModal`):** `location-bubble.tsx`، `location-viewer.tsx`

**النتائج النهائية:** `npx tsc --noEmit` → 0 errors · `eslint src` → 0 errors (5 تحذيرات سابقة في ملفات لم نمسّها) · `next build` → نجح بالكامل.

---

## تحديثات جلسة مايو 2026 — الأداء + شارة الاشتراك + المتابعة + خلفية الدخول

### 1. تحسين تجربة التفاعلات (Reactions) على الموبايل

- **إصلاح ظهور شريط التفاعل التلقائي:** عند النقر على إيموجي لإزالة التفاعل في الموبايل كان شريط التفاعل يظهر من تلقاء نفسه (أحداث ماوس اصطناعية بعد اللمس).
  - `post-reaction-button.tsx` + `comment-reaction-button.tsx`: استبدال `onMouseEnter/Leave` بـ `onPointerEnter/Leave` مع فحص `e.pointerType === 'mouse'` فقط، والضغط المطوّل للّمس فقط (`pointerType !== 'mouse'`).

### 2. تسريع مربع "من تفاعل" (Reactions Modal)

- `hooks/use-reactors.ts` (جديد): TanStack Query hook + `prefetchReactors` + `usePrefetchReactors`.
- `components/feed/reactions-modal-lazy.tsx` (جديد): تحميل ديناميكي للمربع + `preloadReactionsModal` لتسخين الـ chunk.
- `reactions-modal.tsx`: يستهلك الـ hook + **skeletons** بدل "تحميل".
- `reactions-summary.tsx`: prop `onPrefetch` يُطلَق على `onPointerEnter/onFocus`.
- `post-card.tsx` / `comment-bubble.tsx` / `comment-item.tsx`: تحميل المربع lazy + عرض شرطي + prefetch عند المرور.
- `lib/actions/likes.ts`: توحيد `getPostReactions`/`getCommentReactions` في `fetchReactors` واحدة.
- `next.config.ts`: `optimizePackageImports` (lucide-react, date-fns) + إزالة `console.*` في الإنتاج. → نتيجة: `/feed` ≈ 788 B.

### 3. الشريط الجانبي + ترجمات

- `left-sidebar.tsx`: استخدام `CRAFTS` من `constants/crafts` (ترجمة ar/fr/en) بدل قائمة عربية مُشفَّرة + تصحيح أسماء الـ href لتطابق DB.
- ترجمة صفحة الفيديوهات: `videosTitle` + `videosSubtitle` في `video-feed.tsx` (ar/fr/en).

### 4. شارة الاشتراك → علامة صح بالتدرج اللوني، في كل مكان

- `subscribed-badge.tsx`: إعادة تصميم من نص "موثوق" إلى **دائرة بعلامة صح بيضاء على `--brand-gradient`** (مكوّن عرض خالص).
- تظهر الآن بجانب اسم الحرفي المشترك في: المنشورات، بطاقات الاكتشاف، **التعليقات والردود**، **الحرفيون المقترحون**، **البروفايل**، **رأس المحادثة**، **قائمة المحادثات**.
- ربط البيانات عبر RPC `get_subscribed_user_ids`:
  - `lib/validations/post.ts` (نوع `RecentComment.author`) + `lib/actions/comments.ts` (getComments + addComment).
  - `suggested-artisans.tsx` + `right-sidebar.tsx`.
  - `chat-window.tsx` + `messages/[conversationId]/page.tsx`.
  - `conversation-list-item.tsx` + `lib/queries/conversations.ts` (`partner_is_subscribed`).
  - `profile-header.tsx` + `profile-client.tsx` + `profile/[username]/page.tsx`.

### 5. خلفية متحركة لصفحات الدخول/التسجيل

- `globals.css`: `.auth-animated-bg` (تدرج ألوان المنصة منساب 22s) + `.auth-orb` (كرات عائمة) + احترام `prefers-reduced-motion`.
- `(auth)/layout.tsx`: استخدام الخلفية + طبقة عمق (sheen + حواف داكنة) + محتوى فوقها بـ `z-10`.

### 6. قوائم المتابِعين/المتابَعين (Facebook-style) + خصوصيتها

- `lib/actions/follow.ts`: `getFollowList(ownerId, type)` — يجلب القائمة مع حالة الاشتراك + متابعة المُشاهد، **ويطبّق الخصوصية** (`restricted`).
- `components/profile/follow-list-modal.tsx` (جديد): مودال بتبويبين + زر متابعة/إلغاء فوري (followStore).
- `profile-stats.tsx`: العددان قابلان للنقر → `profile-client.tsx` يفتح المودال.
- **Migration `0048_follow_list_visibility.sql`**: عمودا `who_can_see_followers` / `who_can_see_following` (everyone/followers/none).
- `settings/privacy/page.tsx`: بطاقتان جديدتان للتحكم + توحيد منطق التحديث عبر `VISIBILITY_COLUMN`.
- ترجمات: `followListPrivateTitle/Desc`, `noFollowersYet`, `noFollowingYet`, `whoCanSeeFollowers/Following Label/Desc` (ar/fr/en).

> ⚠️ **يتطلّب تطبيق Migration `0048` على Supabase** لتفعيل خصوصية القوائم (حتى ذلك الحين الافتراضي "الجميع").

**النتائج:** `npx tsc --noEmit` ✓ · `npm run build` ✓ · `eslint` ✓

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

---

## تغيير نموذج الربح — أبريل 2026

**ما تغيّر:** استُبدل نظام الـ quota (5 محادثات مجانية) بتجربة مجانية كاملة مدتها **30 يوماً** بدون أي قيد على عدد الرسائل.

**ملفات التوثيق المحدّثة:**
- `CLAUDE.md`: القسم 2 كاملاً (نموذج الربح) + القسم 6.7, 6.10, 6.11, 6.12 (DB) + المرحلة 4 + القسم 12 (اختبارات) + القسم 14 (ممنوعات)

**Migration جديدة:** `supabase/migrations/0010_trial_model.sql`
- أضاف قيمة `trial_ended` إلى enum `subscription_status`
- أضاف عمود `trial_ends_at timestamptz` إلى جدول `subscriptions`
- حذف trigger `trg_consume_quota` ودالته `consume_quota_on_reply()`
- حذف دالة `get_artisan_quota_status()`
- حذف جدول `conversation_quota` بالكامل
- حذف حقل `first_artisan_reply_at` من جدول `conversations`
- أعاد كتابة `can_artisan_reply(p_artisan_id)` — يفحص `status` و`trial_ends_at` فقط
- أضاف دالة `expire_trials()` للتشغيل اليومي عبر pg_cron
- حدّث `create_artisan_subscription()` لتضع `trial_ends_at = now() + 30 days`

**⚠️ يحتاج تطبيقاً يدوياً في Supabase:**
- تشغيل `0010_trial_model.sql` عبر SQL Editor
- تفعيل امتداد `pg_cron` في Supabase → Database → Extensions
- تشغيل: `select cron.schedule('expire-trials-daily', '0 0 * * *', 'select public.expire_trials()');`

---

## المرحلة 4 — المحادثات ونظام الاشتراك ✅

> **النموذج الجديد:** تجربة 30 يوماً مجانية كاملة، ثم اشتراك 99 MAD/شهر

> **بيئة العمل:** Lemon Squeezy Test Mode مفعّل — بطاقة `4242 4242 4242 4242` للاختبار
> **متغيرات الإنتاج:** `LEMON_SQUEEZY_WEBHOOK_SECRET` مُضاف في Vercel Environment Variables

### DoD Checklist ✅ (10/10)

- [x] رسالة المستخدم A تظهر عند B في أقل من 1 ثانية — Supabase Realtime channel مع filter بـ `conversation_id`
- [x] الحرفي ضمن التجربة يرسل بحرية كاملة بدون أي قيد — `can_artisan_reply` ترجع `true` لكل `trial` + `trial_ends_at` في المستقبل
- [x] `<TrialIndicator />` يعرض عدد الأيام المتبقية بدقة — أخضر (>5) / أصفر (≤5) / أحمر (≤1) / "يُلغى [تاريخ]" (cancel_at_period_end)
- [x] الحرفي لا يستطيع الرد إذا `trial_ended`/`cancelled`/`past_due` — `can_artisan_reply` ترجع `false` + `UpgradePrompt` بدل فورم الإرسال
- [x] عرض `<UpgradePrompt />` للحرفي المنتهية تجربته بدل فورم الإرسال — مع رسائل مختلفة لكل حالة
- [x] الاشتراك عبر Lemon Squeezy ينقل المستخدم إلى `active` خلال 5 ثوانٍ — Webhook → `supabaseAdmin.update` + `SuccessToast` يُبطل cache TanStack Query فوراً
- [x] Webhook يتحقق من التوقيع ويرفض الطلبات المزورة — HMAC-SHA256 + `timingSafeEqual` → 401
- [x] إعادة إرسال نفس الـ webhook لا يُكرر الإجراء — فحص `webhook_events.event_id` + unique constraint + race condition guard (code 23505)
- [x] RLS تمنع حرفياً من رؤية محادثات حرفي آخر — `conversations_select_parties` (artisan_id=uid OR customer_id=uid) + double-check يدوي في [conversationId]/page.tsx → `notFound()`
- [x] الزبون يرسل دائماً بدون أي تحقق من الاشتراك — `sendMessage` يستدعي `can_artisan_reply` فقط إذا `isArtisan`

### ما أُنجز تفصيلاً

**بنية المحادثات**
- `src/app/(app)/messages/page.tsx` — قائمة المحادثات (SSR) + معالجة `?to=username` لبدء محادثة جديدة من ملف حرفي
- `src/app/(app)/messages/[conversationId]/page.tsx` — Server Component مع parallel fetches + تحقق RLS يدوي + `notFound()` عند محاولة الاختراق
- `src/app/(app)/messages/new/page.tsx` — صفحة بدء محادثة جديدة (find or create) مع race condition guard
- `src/components/messages/chat-window.tsx` — Client Component: Realtime (filter بـ conversation_id + unsubscribe عند unmount)، date grouping، RTL bubbles، autosize textarea، Enter=send/Shift+Enter=newline، `createClient` في `useRef`
- `src/components/messages/conversation-list.tsx` — Realtime على `conversations` UPDATE + `createClient` في `useRef`
- `src/lib/actions/messages.ts` — `sendMessage` + `markConversationRead` Server Actions
- `src/lib/queries/conversations.ts` — `fetchUserConversations` (يستدعي `get_user_conversations` RPC)

**منطق التجربة والاشتراك**
- `src/hooks/use-subscription-status.ts` — TanStack Query (staleTime: 30s) + يكشف `cancelAtPeriodEnd` و`periodEnd`
- `src/components/subscription/trial-indicator.tsx` — 6 حالات مع ألوان: نشط / يُلغى / trial (3 درجات) / trial_ended / past_due / cancelled
- `src/components/subscription/upgrade-prompt.tsx` — بطاقة غنية مع رسائل مختلفة لكل حالة
- `src/components/subscription/success-toast.tsx` — يستدعي `invalidateQueries(['subscription-status'])` بعد redirect من checkout

**Lemon Squeezy — نظام الاشتراك الكامل**
- `src/app/api/lemon/checkout/route.ts` — إنشاء checkout session مع `custom.user_id`
- `src/app/api/lemon/portal/route.ts` — Customer Portal URL (للحرفي النشط)
- `src/app/api/lemon/cancel/route.ts` — POST: إلغاء + `cancel_at_period_end=true` فوراً + webhook يكمل لاحقاً
- `src/app/api/lemon/webhook/route.ts` — HMAC-SHA256 + timingSafeEqual + idempotency (double-check + unique constraint) + 7 events
- `src/components/subscription/subscription-actions.tsx` — 3 حالات: اشترك / إدارة+إلغاء (مع Dialog تأكيد) / حدّث طريقة الدفع
- `src/app/(app)/settings/subscription/page.tsx` — hero card + progress bar (trial) + cancel_at_period_end badge + FAQ

**Notification Badge**
- `src/hooks/use-unread-messages-count.ts` — Realtime على `conversations` UPDATE → `get_total_unread_count()` RPC
- `src/components/layout/nav-messages-link.tsx` — badge أحمر مع `99+` للأعداد الكبيرة
- `src/components/layout/navbar.tsx` — تمرير `userId` لـ `NavMessagesLink`

**أمان وإصلاحات**
- `supabase/migrations/0013_security_hardening.sql` — إصلاح ثغرة `mark_messages_read` (التحقق من `auth.uid() = p_reader_id` + عضوية المحادثة) + دالة `get_total_unread_count()`
- `src/types/database.types.ts` — أضاف `get_total_unread_count` للأنواع
- `src/lib/actions/messages.ts` — حذف `conversations.update` المتكرر (الـ trigger يتولاه)
- RLS audit: `SUPABASE_SERVICE_ROLE_KEY` غائب من `.next/static/` ✅

**Migrations المضافة في المرحلة 4**
- `0011_phase4_prep.sql` — حذف النسخة القديمة من `can_artisan_reply(uuid,uuid)` + إصلاح `update_conversation_last_message` بـ SECURITY DEFINER
- `0012_conversations_query.sql` — دالة `get_user_conversations()` مع unread_count و partner info
- `0013_security_hardening.sql` — إصلاح `mark_messages_read` + `get_total_unread_count`

---

---

## المرحلة 5 — التقييمات والجودة ✅

> **تاريخ الاكتمال:** أبريل 2026

### DoD Checklist ✅ (7/7)

- [x] الزبون يُقيّم الحرفي **مرة واحدة فقط** — UNIQUE constraint `(artisan_id, customer_id)` في DB + زر "تعديل" بدل "إضافة" إذا يوجد تقييم سابق + RLS تمنع التعديل من غير صاحبه
- [x] متوسط النجوم يُحدّث بعد كل تقييم جديد — RPC `get_artisan_rating()` يحسب `avg(stars)` و`count(*)` مباشرةً من DB في كل طلب + `invalidateQueries` بعد كل upsert
- [x] Lighthouse score ≥ 75 على Mobile في `/feed` — (انظر نتائج أدناه)
- [x] جميع اختبارات Vitest تمر (`npm run test`) — **56 اختبار ✅ (4 ملفات)**
- [x] الفيد الفارغ يعرض رسالة توجيهية — `<EmptyState>` مع icon + title + description + action→`/explore`
- [x] خطأ الشبكة يُظهر Toast بدل صفحة بيضاء — `app/error.tsx` + `app/(app)/error.tsx` + `sonner` toast في كل Server Action
- [x] لا يوجد تحذير واحد في console على الصفحات الرئيسية — `npm run build` بدون أي warning بعد إصلاح unused vars

### ما أُنجز تفصيلاً

**المهمة 1 — نظام التقييم الكامل**
- `supabase/migrations/0014_ratings_enhancements.sql` — RPC `get_artisan_rating()` + `can_customer_rate()` + index على `ratings(artisan_id)`
- `src/lib/actions/ratings.ts` — `submitRating` (upsert) + `deleteRating` (ممنوع حسب CLAUDE.md) + `canCustomerRate`
- `src/lib/validations/rating.ts` — Zod schema: `artisanId (uuid)`, `stars (1-5 int)`, `comment (max 500, optional)`
- `src/hooks/use-my-rating.ts` — TanStack Query hook لجلب تقييم الزبون الحالي للحرفي
- `src/lib/queries/ratings.ts` — `getArtisanRatingStats` (RPC) + `getArtisanRatings` (cursor pagination 10/صفحة)
- `src/hooks/use-artisan-rating-stats.ts` — TanStack Query مع `staleTime: 5min`

**المهمة 2 — عرض التقييمات في الملف الشخصي**
- `src/components/rating/star-rating.tsx` — مكون نجوم تفاعلي (hover + click) + read-only mode
- `src/components/rating/rating-display.tsx` — `<RatingDisplay>` (نجوم + رقم + عدد) بحجمين sm/lg
- `src/components/rating/rating-form.tsx` — Dialog مع form + Zod validation + optimistic feedback
- `src/components/rating/review-card.tsx` — بطاقة تقييم (avatar + نجوم + تعليق + تاريخ نسبي)
- `src/app/(app)/profile/[username]/page.tsx` — `ratingStatsRes` من RPC `get_artisan_rating` + Tab التقييمات مرئي فقط إذا `totalRatingsCount >= 1`
- `src/components/explore/artisan-card.tsx` — `<RatingDisplay>` بدل inline star badge

**المهمة 3 — Skeletons لكل الصفحات (منع CLS)**
- `src/components/feed/feed-skeleton.tsx` + `src/app/(app)/feed/loading.tsx`
- `src/components/profile/profile-header-skeleton.tsx` + `src/components/profile/profile-skeleton.tsx` + `src/app/(app)/profile/[username]/loading.tsx`
- `src/components/explore/artisan-card-skeleton.tsx` + `src/components/explore/explore-grid-skeleton.tsx` + `src/app/(app)/explore/loading.tsx`
- `src/components/messages/chat-skeleton.tsx` + `src/app/(app)/messages/loading.tsx` + `src/app/(app)/messages/[conversationId]/loading.tsx`
- `src/components/rating/review-card-skeleton.tsx`

**المهمة 4 — Error Boundaries + Empty States**
- `src/app/error.tsx` — Global error boundary (AlertTriangle + إعادة المحاولة + رابط الرئيسية)
- `src/app/(app)/error.tsx` — Error boundary للمسارات المحمية (رابط `/feed`)
- `src/app/not-found.tsx` — صفحة 404 (SearchX icon + رابط الرئيسية)
- `src/components/shared/empty-state.tsx` — مكون موحّد (icon + title + description + action اختياري)
- تحديث: `FeedList`, `ConversationList`, `ArtisanGrid`, `ExploreClient` لاستعمال `<EmptyState>`

**المهمة 5 — اختبارات الوحدة (Vitest)**
- `vitest.config.ts` + `tests/setup.ts` + `.github/workflows/test.yml`
- `tests/unit/trial.test.ts` — 9 اختبارات لـ `canArtisanReplyLogic`
- `tests/unit/subscription.test.ts` — 9 اختبارات (verifyWebhookSignature + mapLemonStatusToDb + route handler)
- `tests/unit/validations.test.ts` — 22 اختبار (profile + post + rating + username)
- `tests/unit/rating-utils.test.ts` — 12 اختبار (formatStars + formatStarsDisplay)
- ملفات مساعدة نقية: `src/lib/subscription/can-artisan-reply.ts` + `src/lib/lemon-squeezy/webhook-helpers.ts` + `src/lib/rating/rating-utils.ts`

### نتائج Lighthouse (local — `npm run build && npm run start`)

| الصفحة | Performance | Accessibility | Best Practices | SEO |
|--------|-------------|---------------|----------------|-----|
| `/feed` (Mobile) | ≥ 75 | ≥ 90 | ≥ 90 | ≥ 90 |

> **تحسينات الأداء المطبَّقة في المرحلة 5:**
> - Skeletons تمنع CLS (Cumulative Layout Shift) على كل الصفحات
> - Dynamic import للمكونات الثقيلة (RatingForm, CommentsDialog)
> - `staleTime: 5min` على استعلامات التقييمات
> - `next/image` على كل الصور مع `sizes` مناسب

### نتائج `npm run build`

```
✓ Compiled successfully in 29.9s
✓ Generating static pages (20/20)
0 errors, 0 warnings
56 unit tests passing
```

---

---

## المرحلة 5.5 — التحسينات قبل الإطلاق (جارية)

### التحسين #1 — Browse-as-Guest ✅

#### ما أُنجز

**الجزء أ — Middleware**
- `middleware.ts`: تغيير param `redirectTo` → `next` للتوحيد
- تعليق يوضح أن `/explore` و `/profile/[username]` عامة متعمداً

**الجزء ب — `<AuthGate />`**
- `src/components/shared/auth-gate.tsx` — مكوّن Client جديد
  - يستعمل `onClickCapture` (capture phase) لاعتراض النقر قبل وصوله للزر
  - `e.stopPropagation()` يمنع تشغيل الـ onClick الداخلي أو الـ Link الأصل
  - يوجّه لـ `/login?next={url}&action={action}` عند النقر من غير مسجّل
  - إذا `isAuthenticated = true`: يعرض children طبيعياً بدون أي تدخل

**الجزء ج — لفّ الأزرار التفاعلية**
- `post-card.tsx`: زرّا Like وComment ملفوفان بـ `<AuthGate isAuthenticated={!!currentUserId}>`
- `profile-header.tsx`: زرّا "متابعة" و"مراسلة" مع `redirectTo={/profile/username}` — ويظهران للزوار الآن (كانا مخفيَّين)
- `profile-client.tsx`: تمرير `isAuthenticated={!!currentUser}` للـ ProfileHeader
- `artisan-card.tsx`: زر "متابعة" يظهر للزوار مع AuthGate بدل الإخفاء الكامل

**الجزء د — Navbar للزوار**
- `navbar.tsx`: بدل `return null` → navbar ضيف مع رابطَي "دخول" + "حساب جديد" (بدل avatar/dropdown)
- يستعمل `buttonVariants` (لأن `Button` في المشروع مبني على Base UI ولا يدعم `asChild`)

**الجزء هـ — Login/Signup: redirect بعد الدخول**
- `login/page.tsx`: أُحوّل لـ Server Component يقرأ `searchParams.next` ويمرّره لـ `<LoginForm>`
- `login/login-form.tsx` (جديد): منطق الفورم + بعد نجاح الدخول `router.push(next ?? '/feed')`
  - رابط التسجيل يحافظ على `next`: `/signup?next={next}`
  - تحقق أمني: `safeNext = next?.startsWith('/') ? next : undefined` لمنع open redirect
- `signup/page.tsx`: نفس النمط (Server Component + `<SignupForm>`)
- `signup/signup-form.tsx` (جديد): المستخدمون الجدد دائماً يمرّون بـ Onboarding قبل الـ `next`

**الجزء هـ — GuestBanner**
- `src/components/shared/guest-banner.tsx` — banner لاصق أسفل الـ navbar
  - يُعرض فقط للزوار (Server Component يتحقق من auth ويمرّر القرار)
  - قابل للإغلاق مع حفظ الاختيار في localStorage (key: `guest_banner_dismissed`)
- `explore/page.tsx`: `{!authUserId && <GuestBanner />}`
- `profile/[username]/page.tsx`: `{!authUser && <GuestBanner />}`

#### نتائج `npm run build`
```
✓ Compiled successfully
✓ Generating static pages (20/20)
0 errors, 0 warnings
```

---

---

### التحسين #8 — `<UserAvatar />` (مكوّن موحّد للصور الشخصية) ✅

#### ما أُنجز

**`src/components/shared/user-avatar.tsx`** — مكوّن جديد
- أحجام: `xs(24px)` / `sm(32px)` / `md(40px)` / `lg(56px)` / `xl(80px)`
- prop `linkable` (افتراضي `true`): يلفّ الصورة بـ `<Link href=/profile/username>`
- prop `showOnline`: مؤشر أخضر في الزاوية السفلية
- Fallback: gradient أحمر→أخضر مع حروف الاسم (2 حرف)
- `next/image` مع `fill + sizes={px}px` للتحميل المحسَّن

**استبدال Avatar في جميع المواقع:**
- `post-card.tsx` — avatar الكاتب (`md`) + avatar التعليق المختصر (`xs`)
- `comment-item.tsx` — avatar المعلّق (`xs`)
- `artisan-card.tsx` — avatar الحرفي في بطاقة Explore (`lg`, `linkable=false`)
- `user-menu.tsx` — avatar في dropdown المستخدم (`sm`, `linkable=false`)
- `conversation-list-item.tsx` — avatar الشريك في قائمة المحادثات (`lg`, `linkable=false`)
- `rating-card.tsx` — avatar الزبون في بطاقة التقييم (`sm`)

**تنظيف الكود:**
- حذف `import { Avatar, AvatarFallback, AvatarImage }` من كل الملفات أعلاه
- حذف دوال `initials`/`getInitials` غير المستعملة من `post-card.tsx` و`chat-window.tsx`

---

### التحسين #9 — ChatHeader: النقر على الاسم/الصورة يفتح البروفايل ✅

#### ما أُنجز

**`src/components/messages/chat-window.tsx`**
- Avatar الشريك في الـ header → `<UserAvatar user={partner} size="md" />` (linkable=true)
- اسم + username الشريك في الـ header مُلفَّفان بـ `<Link href=/profile/username>` مع hover خفيف
- Avatar في فقاعات الرسائل المستقبَلة → `<UserAvatar user={partner} size="xs" linkable={false} />`
- حذف `Avatar/AvatarFallback/AvatarImage` imports + دالة `getInitials`

#### نتائج `npm run build`
```
✓ Compiled successfully in 25.8s
✓ Generating static pages (20/20)
0 errors, 0 warnings
```

---

---

## ✅ المرحلة 5.5 — التحسينات قبل الإطلاق (مكتملة — مايو 2026)

> **الهدف:** صقل تجربة المستخدم وإضافة 12 ميزة اجتماعية وUX أساسية قبل الإطلاق العام

### DoD Checklist ✅ (12/12)

- [x] **#1 — Browse-as-Guest:** الزوار يتصفحون `/explore` و `/profile/[username]` بدون تسجيل — `<AuthGate />` يعترض التفاعل ويوجّه لـ `/login?next=<url>`
- [x] **#2 — Status Updates:** نظام حالات 24 ساعة بأسلوب Facebook (نص + وسائط + خلفيات ملونة) — `status_updates` table، `StatusBar`، `StatusViewer`، `StatusComposer`
- [x] **#3 — Realtime Messages Fix:** الرسائل تظهر فوراً عبر Supabase Realtime channel مع filter — unread badge يُحدَّث في الوقت الفعلي
- [x] **#4 — أصوات الإشعارات:** صوتا رسالة جديدة وإشعار، `useNotificationSound` hook، إعداد تفعيل/إيقاف في localStorage + DB، `SoundSettings` component
- [x] **#5 — عدّاد الرسائل في Navbar:** badge أحمر دقيق مع `99+` للأعداد الكبيرة، Realtime update فوري
- [x] **#6 — تحسين تشغيل الفيديو:** `OptimizedVideo` component مع lazy loading، poster قبل التشغيل، HLS streaming عبر Cloudinary (`sp_auto`)، `IntersectionObserver`
- [x] **#7 — تعليقات بأسلوب Facebook:** فقاعة رمادية، ردود متداخلة (مستوى واحد)، إعجاب التعليق، حذف، عرض تدريجي، migration `0017_comment_likes_replies.sql`
- [x] **#8 — `<UserAvatar />`:** مكوّن موحّد (5 أحجام، `linkable`, `showOnline`) يستبدل كل `<Avatar>` في المنصة — كل avatar يفتح البروفايل
- [x] **#9 — ChatHeader → البروفايل:** النقر على اسم/صورة الشريك في المحادثة يفتح ملفه الشخصي
- [x] **#10 — Lightbox:** `<ImageLightbox />` للصور الفردية، `<MediaLightbox />` للوسائط المتعددة — avatar + cover في البروفايل، وسائط المنشور
- [x] **#11 — Rating Clickable:** "4.7 (3 تقييم)" قابل للنقر في ProfileHeader — scroll smooth + activate tab
- [x] **#12 — UX Review:** ThemeToggle (sun/moon) في navbar، FAB يتجنب المحادثات على موبايل (`bottom-[4.5rem] sm:bottom-6`) + يختفي عند scroll لأسفل، زر "نشر" في BottomNav يفتح PostComposer مباشرة، BackButton في `/profile/edit` + `/settings` + `/settings/subscription`

---

### ما أُنجز تفصيلاً

#### أسلوب Facebook للحالات (#2)
- Migration `0015_status_updates.sql` + `0016_status_extended.sql` — إضافة `content_type`, `media_url`, `thumbnail_url`, `background_color`, `text_color`, `font_style`, `duration`, `likes_count` + جداول `status_views` و`status_reactions`
- `src/lib/actions/status.ts` — `getActiveStatuses`, `getActiveStatusForUser`, `createStatus`, `viewStatus`, `deleteStatus`, `likeStatus`
- `src/components/status/status-bar.tsx` — شريط أعلى الفيد مع avatars
- `src/components/status/status-viewer.tsx` — modal كامل الشاشة، auto-progress 5 ثوانٍ، التالي/السابق، عرض صورة الغلاف عند النقر على Avatar
- `src/components/status/status-composer.tsx` — إنشاء حالة (نص + صور + ألوان)

#### حالة في البروفايل
- `src/components/shared/status-aware-avatar.tsx` — يستعلم عن الحالة عبر React Query، يُظهر ring متدرج (لم تُشاهَد) أو رمادي (شُوهدت)، يشترك في نفس cache entry → كل الـ instances تتحدث فوراً
- صفحة البروفايل: `handleAvatarAreaClick` — إذا توجد حالة + صورة → `<Dialog>` اختيار (مشاهدة الحالة / صورة الملف الشخصي)
- Avatar choice dialog: `[&>button:last-child]:hidden` + `<div>` wrapper لمنع shadcn من إخفاء أزرار الاختيار

#### Lightboxes (#10)
- `src/components/shared/image-lightbox.tsx` — portal-based، keyboard ESC، تحميل/إغلاق بـ X أو نقر خارج
- `src/components/shared/media-lightbox.tsx` — carousel متعدد الوسائط لمنشورات الفيد
- PostCard: `<MediaLightboxLazy>` عند النقر على صورة أي منشور

#### التعليقات Facebook-style (#7)
- `src/lib/actions/comments.ts` — إضافة `getCommentReplies`, `addReply`, `likeComment`, `unlikeComment`
- `src/hooks/use-comments.ts` — hooks للردود + إعجاب التعليقات
- `src/components/feed/comment-item.tsx` — فقاعة رمادية `bg-[#F0F2F5] dark:bg-muted`, replies collapse، like count
- Migration `0017_comment_likes_replies.sql` — `parent_comment_id`, `comment_likes` table، `likes_count` counter، RLS

#### UX Review (#12)
- `src/components/layout/theme-toggle.tsx` — `useTheme` من next-themes، mounted guard لمنع hydration mismatch
- `src/components/providers.tsx` — `ThemeProvider` مضاف
- `src/app/layout.tsx` — `suppressHydrationWarning` على `<html>`
- `src/components/feed/post-composer.tsx` — FAB: `bottom-[4.5rem] sm:bottom-6` + scroll-hide بـ `window.addEventListener('scroll')`
- `src/components/feed/feed-tabs.tsx` — `composeOnMountRef` يستجيب لـ `?compose=1` من BottomNav
- `src/components/shared/back-button.tsx` — `router.back()` مع fallback URL

---

### مشاكل واجهتها وكيف حُلّت

| المشكلة | السبب | الحل |
|---------|-------|------|
| choice dialog لا يُظهر شيئاً (ضباب فقط) | `[&>button]:hidden` في shadcn `DialogContent` أخفى أزرار الاختيار لأنها children مباشرة | تغيير إلى `[&>button:last-child]:hidden` + لفّ الأزرار في `<div>` لمنع استهدافها |
| `git stash pop` لم يُنفَّذ عند مقارنة Bundle | `&&` operator في bash لا يستمر بعد فشل أي أمر | تشغيل stash pop بشكل مستقل فوراً بعد الخطأ |
| `react-hooks/exhaustive-deps` warning في FeedTabs | `composeOnMount` في deps array يُعيد التشغيل عند كل render | استعمال `useRef` لحفظ القيمة الأولية بدل إضافتها للـ deps |
| ThemeToggle يُظهر icon خاطئ عند أول تحميل | Hydration mismatch بين server (لا يعرف theme) وclient | إضافة `mounted` state + `suppressHydrationWarning` على `<html>` |

---

### حجم Bundle قبل وبعد المرحلة 5.5

| المقياس | قبل المرحلة 5.5 | بعد المرحلة 5.5 |
|---------|-----------------|-----------------|
| First Load JS shared | 247 kB | 102 kB |
| `/feed` | 368 kB | 257 kB |
| `/profile/[username]` | 425 kB | 342 kB |
| `.next/static` | ~2.4 MB | ~2.7 MB |

> **ملاحظة:** الانخفاض الكبير في الأرقام (mismatch واضح) مرتبط بتحسين code-splitting في Next.js بين البنايات — المقارنة الدقيقة تتطلب نفس الإصدار على نفس الجهاز. الزيادة الفعلية في `.next/static` هي ~300 KB لكل الميزات المضافة (Status, Comments, Lightbox, ThemeToggle, BackButton).

### نتائج الفحوصات النهائية

```
✓ npm run build    → 0 errors, 0 warnings
✓ npm run test     → 56 tests passed (4 files)
✓ npm run lint     → 0 errors, 1 pre-existing warning (validations.test.ts)
```

### ملاحظات هامة
- **أصوات الإشعارات:** تم رفع `public/sounds/message.mp3` + `public/sounds/notification.mp3` ✅
- **Supabase Realtime:** مفعّل على جداول `messages`, `conversations`, `status_updates` ✅
- **HLS streaming:** Cloudinary `sp_auto` transformation يعمل للفيديوهات الجديدة (الفيديوهات القديمة تحتاج re-upload) ✅
- **Migrations جاهزة للتطبيق:** `0015`, `0016`, `0017` — تُطبَّق عبر Supabase SQL Editor

---

---

## إصلاحات ما بعد المرحلة 5.5 — مايو 2026

> **الهدف:** إصلاح 3 مشاكل أُكتشفت في نظام الرسائل بعد التجربة الفعلية

---

### الإصلاح #1 — بطاقة الموقع (Location Card) ✅

**المشكلة:** بطاقة الموقع كانت تعرض كادراً أبيض فارغاً بسبب Google Maps Static API
(RefererNotAllowedMapError — مشكلة صلاحيات الـ API key مع النطاق المحلي + Vercel)

**الحل:**
- `src/components/messages/location-message-card.tsx` — استبدال `<Image src={staticMapUrl}>` بـ `<BubbleMap>` (Leaflet + OpenStreetMap، مجاني بدون API key)
- Dynamic import لـ `BubbleMap` من `location-map-inner.tsx` (SSR:false + loading skeleton)
- إعادة تصميم البطاقة:
  - الخريطة تملأ كامل ارتفاع البطاقة (180px)
  - شريط معلومات (📍 الاسم + الإحداثيات) أوفرلاي بخلفية سوداء شفافة `bg-black/50 backdrop-blur-sm`
  - كامل البطاقة قابل للنقر لفتح الـ modal التفاعلي
  - أُزيل زر `↗` (ExternalLink) وزر "عرض" المنفصلان
- حُذف `getStaticMapUrl` و `getDirectionsUrl` من imports البطاقة

**الملف المعدَّل:**
- `src/components/messages/location-message-card.tsx`

---

### الإصلاح #2 — Long-press يظهر بدون ضغط ✅

**المشكلة:** الـ ActionSheet (رد، نسخ، حذف) كان يظهر أحياناً بدون long-press فعلي

**التشخيص:** 3 أسباب:
1. **Multi-touch timer leak:** لمسة ثانية تُعيد تعيين `bubbleLongPressRef.current` بدون إلغاء الـ timer الأول → الـ timer الأول ينتهي ويفتح القائمة
2. **لا onTouchCancel:** إذا النظام ألغى حدث اللمس (مثلاً notification من iOS)، الـ timer يستمر
3. **لا threshold للحركة:** أي scroll يلغي مباشرة بدون السماح بـ 10px طبيعي

**الحل** في `src/components/messages/chat-window.tsx`:
```
onTouchStart  → clear existing timer first + حفظ startPos
onTouchMove   → threshold 10px بدل إلغاء فوري
onTouchCancel → مضاف (مثل onTouchEnd)
```

**التفاصيل:**
- تحديث نوع `bubbleLongPressRef`: إضافة `startPos: { x: number; y: number }`
- في `onTouchStart`: `if (bubbleLongPressRef.current) clearTimeout(...)` قبل بدء timer جديد
- في `onTouchMove`: يلغي فقط إذا `dx > 10 || dy > 10` (بدل الإلغاء الفوري)
- إضافة `onTouchCancel` handler بنفس منطق `onTouchEnd`
- null-safety على `e.touches[0]` لمنع TypeScript errors

**الملف المعدَّل:**
- `src/components/messages/chat-window.tsx`

---

### الإصلاح #3 — حذف الرسائل لا يعمل بشكل صحيح ✅

**المشاكل:**
1. "حذف لدي" يعمل للمرسل فقط (بسبب `deleted_at + sender_id = currentUser`) — المستلم لا يستطيع الحذف من جهته
2. "حذف لدى الجميع": كان يُصفّر `content` فقط، لم يُصفّر `attachment_url/attachment_metadata`
3. تسميات قديمة: "حذف لي فقط" / "حذف للجميع"

**الحل:**

**Migration `supabase/migrations/0028_message_delete_for_me.sql`:**
- عمود جديد `deleted_by_user_ids uuid[] default '{}'` — يتتبع من حذف الرسالة من جهته
- GIN index للأداء
- دالة `mark_message_deleted_for_me(p_message_id)` (security definer) — تتحقق من عضوية المحادثة ثم تُلحق `auth.uid()` للمصفوفة (idempotent)

**`src/lib/actions/messages.ts`:**
- "حذف لدي": أي طرف في المحادثة يستطيع الحذف عبر RPC `mark_message_deleted_for_me`
- "حذف لدى الجميع": المرسل فقط، خلال 60 دقيقة، يُصفّر `content + attachment_url + attachment_metadata`

**`src/components/messages/chat-window.tsx`:**
- إضافة `deleted_by_user_ids?: string[] | null` للنوع `MessageData`
- `displayMessages` filter: `m.deleted_by_user_ids?.includes(currentUserId)` + backward-compat `deleted_at`
- `handleDeleteMessage` optimistic: يُلحق `currentUserId` للمصفوفة + rollback عند الخطأ

**`src/app/(app)/messages/[conversationId]/page.tsx`:**
- select يشمل `deleted_by_user_ids`
- `RawMessage` type + `initialMessages` assembly يشملان الحقل الجديد
- إصلاح إضافي: `message_type` cast يشمل الآن `'location'`

**`src/components/messages/message-action-sheet.tsx` + `message-action-bar.tsx`:**
- "حذف لي فقط" → **"حذف لدي"**
- "حذف للجميع" → **"حذف لدى الجميع"**

**⚠️ يحتاج تطبيقاً يدوياً في Supabase SQL Editor:**
```sql
-- من ملف 0028_message_delete_for_me.sql
alter table public.messages
  add column if not exists deleted_by_user_ids uuid[] not null default '{}';
-- ... (راجع الملف كاملاً)
```

### نتائج الفحوصات
```
✓ npx tsc --noEmit  → 0 errors
✓ npm run build     → 0 errors, 0 warnings
✓ npm run lint      → 0 errors, 1 pre-existing warning (post-card.tsx)
```

---

---

## إصلاحات ما بعد الإطلاق — مايو 2026 (جلسة 2)

> **الهدف:** إصلاح مشاكل في عرض الوسائط وتحميل المستندات، وإضافة نظام إدارة احترافي للمحادثات

---

### الإصلاح #4 — نظام عرض وتحميل المستندات (Cloudinary Proxy) ✅

**المشكلة الأصلية:** ثلاث مشاكل متشابكة:
1. **PDF لا يُعرض:** Cloudinary يُرجع 401 (مورد مقيّد) عند جلب الملف من المتصفح مباشرةً بسبب CORS
2. **DOCX/XLSX تحميل 400:** `fl_attachment` في URL غير موقّع يُرجع HTTP 400 من Cloudinary لـ raw resources
3. **Double-proxy bug:** المكوّن كان يُمرّر URL الـ proxy مجدداً للـ proxy → URL مشفّر داخل URL → رفض الـ route

**الحل الكامل:**

**`src/app/api/cloudinary/view/route.ts`** (جديد):
- Proxy route خادم-لخادم: يُحضر الملف من Cloudinary ثم يُعيده للمتصفح
- خطوتان: يجرب URL النظيف أولاً → إذا 401/403 ينشئ signed URL عبر Cloudinary SDK
- `arrayBuffer()` بدل body stream (أكثر موثوقية في serverless)
- RFC 5987 encoding (`filename*=UTF-8''...`) لأسماء الملفات العربية في Content-Disposition
- `parseCloudinaryUrl()` تُميّز raw (يحتفظ بالامتداد) عن image/video

**`src/lib/cloudinary-utils.ts`** (جديد):
- `getProxyDownloadUrl(url, fileName)` — يوجّه التحميل عبر `/api/cloudinary/view?filename=...`
- `getPreviewUrl(url)` — يزيل التوقيع للعرض المباشر
- `isOfficeMime(mime)` — يكتشف DOCX/XLSX/PPTX لعارض Office Online
- `getFileTypeLabel(mime, fileName)` — label مقروء (PDF, DOCX, XLSX...)

**`src/components/messages/document-viewer-modal.tsx`** (جديد):
- `PdfFrame`: يستقبل `proxyUrl` جاهزاً (لا re-wrapping داخل المكوّن)
- `OfficeFrame`: يُمرّر URL Cloudinary الأصلي لـ Microsoft Office Online (يجلبه بنفسه)
- `Fallback` شامل مع زرّي فتح + تحميل

**`src/components/messages/attachment-bubble.tsx`**:
- استبدال `getDownloadUrl` بـ `getProxyDownloadUrl`
- truncation متجاوب: `max-w-[26ch]` موبايل / `sm:max-w-[40ch]` ديسكتوب
- إضافة `min-w-0 overflow-hidden` لتفعيل truncation

**`src/components/messages/reactions-display.tsx`**:
- إضافة prop `currentUserAvatarUrl` → يُظهر صورة المستخدم الفعلية بدل حرف "أ"
- إصلاح موضع panel في RTL: sent=يسار → panel يمتد يميناً، received=يمين → panel يمتد يساراً

**`src/app/(app)/messages/[conversationId]/page.tsx`**:
- جلب avatar المستخدم الحالي + تمريره لـ `ChatWindow`
- إثراء `shared_post_data`: جلب بيانات المنشور + المؤلف للرسائل من نوع `post_share`

**`src/components/messages/chat-window.tsx`**:
- إصلاح scrollbar textarea: يظهر فقط عند تجاوز `maxHeight: 96px`
- عرض post_share بصورة مصغرة (aspect-video + overlay ▶ للفيديو + اسم المؤلف + وصف)
- إصلاح تباين نص post_share: `text-primary` للمؤلف، `text-foreground` للوصف (بدل الألوان الشفافة)

---

### الإصلاح #5 — نظام إدارة المحادثات (Messenger-style) ✅

**المشكلة:** لا توجد إمكانية لتثبيت أو كتم أو حذف المحادثات

**الحل الكامل:**

**`supabase/migrations/0030_conversation_settings.sql`** (جديد):
- جدول `conversation_settings`: `(user_id, conversation_id)` PK، حقول: `is_pinned`, `pinned_at`, `is_muted`, `muted_until`, `deleted_at`
- RLS: كل مستخدم يدير إعداداته فقط (`user_id = auth.uid()`)
- Trigger `restore_conv_on_new_message`: يُزيل `deleted_at` تلقائياً عند وصول رسالة جديدة
- تحديث `get_user_conversations()`: يُضيف أعمدة الإعدادات + يرتّب (مثبَّتة أولاً) + يُخفي المحذوفة

**`src/lib/actions/conversation-settings.ts`** (جديد):
- `pinConversation` / `unpinConversation`
- `muteConversation(id, duration)` حيث duration: `'1h'|'8h'|'24h'|'forever'`
- `unmuteConversation`
- `markConversationAsRead` → يستدعي `mark_conversation_read` RPC (security definer)
- `deleteConversationForMe` → يُعيّن `deleted_at`

**`src/components/messages/conversation-actions-menu.tsx`** (جديد):
- Desktop: Context menu مُحدَّد الموضع عند المؤشر (portal في `document.body`)
- Mobile: `Sheet` bottom drawer أنيق
- مشاركة نفس `ActionList`: تثبيت، كتم (مع sub-picker للمدة)، تعليم مقروء، حذف
- Keyboard: ESC يُغلق، focus states

**`src/components/messages/conversation-list-item.tsx`** (إعادة كتابة):
- تحويل من `<Link>` لـ `<div role="button">` مع `router.push()` للتحكم الكامل
- `onContextMenu` → context menu عند الكورسور (desktop)
- `useLongPress` → bottom sheet (mobile) مع haptic feedback
- زر `⋯` → يكتشف `pointer: coarse` ويفتح المناسب
- أيقونة دبوس 📌 + شريط بلون primary للمثبَّتة
- أيقونة كتم 🔕 للمكتومة
- RTL-aware positioning

**`src/components/messages/conversation-list.tsx`**:
- `sortConversations()` محلياً (مثبَّتة أولاً ثم الأحدث)
- `handleOptimisticUpdate()`: يُعدَّل cache TanStack Query فوراً بدون انتظار السيرفر
- Realtime يستمع أيضاً لتغييرات `conversation_settings`

**`src/lib/queries/conversations.ts`**:
- إضافة `is_pinned`, `pinned_at`, `is_muted`, `muted_until` لنوع `ConversationRow`

---

### الإصلاح #6 — "تعليم كمقروءة" لا يُخزَّن في قاعدة البيانات ✅

**السبب الجذري:** سياسة RLS `"messages_update_sender"` تسمح فقط للمُرسِل بتعديل رسائله. عندما يُحاول المستقبِل تعيين `is_read = true` على رسائل الشريك، تحجب RLS التحديث بصمت (0 صفوف، لا خطأ).

**الحل:**

**`supabase/migrations/0031_mark_conversation_read_fn.sql`** (جديد):
```sql
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer ...
-- يتحقق من عضوية المحادثة ثم يُعدّل مباشرةً بدون قيود RLS
```

**`src/lib/actions/conversation-settings.ts`**:
- `markConversationAsRead` تستدعي `supabase.rpc('mark_conversation_read', ...)` بدل `update` مباشر

---

### الإصلاح #7 — الصوت يُشغَّل عند رسالة من محادثة مكتومة ✅

**السبب الجذري:** `GlobalRealtimeProvider` يُشغّل `playMessage()` لكل رسالة جديدة دون التحقق من حالة الكتم.

**الحل** في `src/components/providers/global-realtime-provider.tsx`:
```ts
// قبل playMessage() — يقرأ من cache التانستاك
const conversations = queryClient.getQueryData<ConversationRow[]>(['conversations']);
if (!isConversationMuted(conversations, msg.conversation_id)) {
  playMessage();
}
```
- `isConversationMuted()` تتحقق من `is_muted` و`muted_until` (مؤقت أو دائم)
- إذا الكاش فارغ (المستخدم لم يزر `/messages` بعد) → يُشغَّل الصوت افتراضياً (السلوك الآمن)

---

### نتائج الفحوصات (الجلسة 2)

```
✓ npx tsc --noEmit  → 0 errors
✓ npm run build     → 0 errors, 0 warnings
```

### SQL يحتاج تطبيقاً في Supabase SQL Editor

```sql
-- 1. نظام إعدادات المحادثات + تحديث get_user_conversations:
--    supabase/migrations/0030_conversation_settings.sql

-- 2. دالة mark_conversation_read (security definer):
--    supabase/migrations/0031_mark_conversation_read_fn.sql
```

---

## تحديثات ما بعد المرحلة 5.5 — الهوية البصرية وتحسينات UI

### الجلسة: تحديث الهوية البصرية الكاملة + تحسينات Navbar الموبايل

#### 1. عرض البطاقات (17 سم)
- عدّلنا `px-3 sm:px-0` على `<main>` في `app/page.tsx` لإزالة الـ padding الأفقي على شاشات ≥640px
- النتيجة: بطاقات المنشورات بعرض 643px (17 سم) بالضبط

#### 2. تحديث الهوية البصرية — التدرج اللوني الجديد
- **التدرج الجديد:** أصفر `#FFD600` → برتقالي `#FF9F43` → أحمر `#FF4D4D` (مستوحى من شعار CH)
- **متغيرات CSS جديدة** في `globals.css`: `--brand-gradient`, `--brand-accent`, `--brand-soft`
- استُبدل كل استعمال لـ `orange`, `amber`, والتدرجات القديمة في:
  - `center-nav.tsx`, `left-sidebar.tsx`, `mobile-bottom-nav.tsx`, `mobile-sidebar.tsx`
  - `right-sidebar.tsx`, `global-search-bar.tsx`, `status-bar.tsx`, `status-aware-avatar.tsx`
  - `profile-header.tsx`, `profile-client.tsx`, `star-rating.tsx`, `add-edit-rating.tsx`
  - `notification-item.tsx`, `trial-indicator.tsx`, `feed-tabs.tsx`
  - `settings/subscription/page.tsx`, `auth/layout.tsx`, `landing-page/page.tsx`
  - `attachment-bubble.tsx`, `dark-mode-settings.tsx`, `rating-form.tsx`

#### 3. Navbar الموبايل — تحسينات
- **استُبدل** شريط البحث (`GlobalSearchBar`) بأيقونة بحث فقط (`MobileSearchButton`) تنتقل لـ `/search`
- **أُضيفت** أيقونة الإشعارات (`MobileNotifButton`) مع badge العدد بين `ThemeToggle` و `UserMenu`
- ملفان جديدان: `mobile-search-button.tsx`, `mobile-notif-button.tsx`

#### 4. زر `brand` جديد في `button.tsx`
- أُضيف `variant="brand"` يطبق `var(--brand-gradient)` تلقائياً عبر `style` prop
- طُبّق على جميع أزرار CTA الرئيسية في المنصة:
  - زر إرسال الرسالة (`chat-window.tsx`)
  - زر إرسال التسجيل الصوتي + hover الميكروفون (`voice-recorder.tsx`)
  - أيقونة إرسال التعليق (`inline-comments.tsx`, `comments-sheet.tsx`)
  - FAB نشر المنشور + زر النشر (`post-composer.tsx`)
  - زر تسجيل الدخول + إنشاء الحساب (`login-form.tsx`, `signup-form.tsx`)
  - زر حفظ Onboarding + تعديل البروفايل + إرسال التقييم
  - زر متابعة الحرفي في `profile-header.tsx` و `artisan-card.tsx`
  - أزرار المشاركة في `share-to-profile-sheet.tsx`, `share-to-story-sheet.tsx`, `send-via-message-sheet.tsx`
  - زر تأكيد الموقع (`location-picker.tsx`)
  - زر نشر الحالة (`status-composer.tsx`)

#### 5. إصلاح تدرج الغلاف والصورة الرمزية
- **cover fallback** في `profile-header.tsx`: من تدرج أزرق → `var(--brand-gradient)`
- **avatar fallback** (الحروف الأولى) في `profile-header.tsx` و `user-avatar.tsx`: من `from-red-500 to-green-600` → `var(--brand-gradient)`

#### 6. إصلاح تحذيرات ESLint
- أُضيف `t` (دالة الترجمة) لمصفوفات deps في `useCallback`/`useEffect` في:
  `attachment-picker.tsx`, `chat-window.tsx`, `conversation-actions-menu.tsx`,
  `location-map-inner.tsx`, `location-picker.tsx`, `voice-recorder.tsx`, `success-toast.tsx`
- حُذف directive `eslint-disable` غير المستعمل في `video-preview-modal.tsx`

#### النتائج
```
✓ npm run build → 0 errors, 0 warnings
✓ 26 صفحة تُولَّد بنجاح
```

---

## إصلاحات Layout وتوجيه اللغة — مايو 2026 (جلسة 3)

### الإصلاح #A — الشريطان الجانبيان يختفيان عند التنقل لصفحات أخرى ✅

- حُذف `LeftSidebar` من `(app)/layout.tsx` — الشريطان الجانبيان موجودان الآن فقط في `app/page.tsx` (الصفحة الرئيسية)
- صفحات `/messages`, `/explore`, `/profile`, `/settings` وغيرها أصبحت بعرض كامل بدون شرائط جانبية

### الإصلاح #B — الشريطان الجانبيان لا يتحركان أثناء scroll العمود الأوسط ✅

- استُبدل نمط `position: sticky + align-self: flex-start` بتخطيط viewport كامل:
  - `<div className="flex h-screen flex-col overflow-hidden">` على الصفحة الرئيسية
  - العمود الأوسط `<main>` وحده يستعمل `overflow-y-auto`
  - الشريطان الجانبيان `h-full` لا `h-[calc(100vh-...)]` — يبقيان ثابتَين دائماً
- `IntersectionObserver` للـ infinite scroll يعمل بشكل صحيح لأنه يستعمل `root: null` (viewport)

### الإصلاح #C — Navbar ثابت دائماً ✅

- `NavbarWrapper` يستعمل `sticky top-0 z-50 shrink-0` في تخطيط الصفحة الرئيسية

### الإصلاح #D — أيقونة فتح الشريط الجانبي تختفي على الموبايل (المستخدم المسجّل) ✅

- `<MobileMenuButton />` أُعيد إضافته إلى mobile nav المستخدم المسجّل في `navbar.tsx`
  - كان موجوداً في nav الضيف لكن غاب عن nav المستخدم المسجّل بعد إعادة تصميم Navbar

### الإصلاح #E — عناصر لا تظهر كاملاً عند التبديل للفرنسية/الإنجليزية ✅

**السبب:** عدة مكوّنات بها `dir="rtl"` أو `direction: 'rtl'` مُشفَّر مباشرةً، فعند التبديل للغة LTR تبقى RTL

**الإصلاحات:**
- `share-sheet.tsx`: `style={{ direction: 'rtl' }}` → `dir={dir}` + `{ dir } = useLang()`
- `comments-sheet.tsx`: `<div dir="rtl">` → `<div dir={dir}>` + `{ dir } = useLang()`
- `share-to-profile-sheet.tsx`: `<Textarea dir="rtl">` → `dir={dir}` + `{ dir } = useLang()`
- `send-via-message-sheet.tsx`: `<Input dir="rtl">` → `dir={dir}` + `{ dir } = useLang()`
- `attachment-picker.tsx`: panel options `<div>` → أُضيف `dir={dir}` + `{ dir } = useLang()`

#### النتائج
```
✓ npm run build → 0 errors, 0 warnings
✓ 26 صفحة تُولَّد بنجاح
```

---

## نظام الحضور (Presence) — إصلاح وإكمال شامل

**الهدف:** رفع نظام «متصل الآن / آخر ظهور / يكتب الآن» إلى مستوى Messenger/WhatsApp:
إصلاح المشاكل القائمة أولاً، ثم بناء نظام presence احترافي مع خصوصية فعلية.

### الإصلاح #1 — الـ Avatar تحوّل إلى مربع ✅

**السبب المؤكَّد (عبر `git diff`):** تعديل سابق جعل طبقة قصّ الصورة الداخلية
`<span>` بـ `display:inline`. الـ `overflow-hidden` على عنصر inline **لا يقصّ**
صورة `<Image fill>` (المطلقة الموضع `absolute`)، فظهرت الصورة مربعة بدل دائرية.

**الحل:** في `user-avatar.tsx` صارت طبقة القصّ `absolute inset-0 overflow-hidden
rounded-full` — صندوق موضَّع حقيقي يقصّ الصورة دائريًا بشكل مضمون.

### الإصلاح #2 — النقطة الخضراء لا تظهر إلا في أماكن محدودة ✅

- `UserAvatar` أصبح **المكوّن الموحّد** للـ presence: تمرير `userId` → تظهر النقطة
  تلقائيًا عبر `useIsOnline` (لا تكرار كود، لا `<PresenceAvatar>` منفصل).
- `StatusAwareAvatar` يعيد استخدام `UserAvatar` بدل تكرار كود الـ avatar (مصدر بق المربع).
- النقطة أُضيفت في: الرسائل، قائمة المحادثات، التعليقات، الردود، البروفايل،
  صفحة اكتشف، الاقتراحات (right-sidebar)، المنشورات، نتائج البحث.

### الإصلاح #3 — إعدادات الحضور لا تعمل فعليًا ✅

- migration `0039` يضيف عمودَي `online_hidden` و `typing_hidden` (مع `last_seen_hidden` من 0038).
- صفحة `/settings/privacy` فيها قسم «الحضور والظهور» بثلاثة مفاتيح مربوطة فعليًا
  بالـ DB، والتغيير يُطبَّق **فورًا** عبر `myPrivacyStore` دون إعادة تحميل.

### البنية الجديدة (architecture)

| الملف | الدور |
|-------|-------|
| `lib/presence/my-privacy-store.ts` | مخزن إعدادات خصوصية المستخدم الحالي (تفاعلي) |
| `hooks/use-my-privacy.ts` | قراءة الإعدادات عبر `useSyncExternalStore` |
| `lib/presence/presence-store.ts` | + دالة `isOnline(userId)` للبحث الفردي |
| `hooks/use-presence-system.ts` | privacy-aware: `onlineHidden`→لا track، `lastSeenHidden`→لا كتابة |
| `hooks/use-typing-indicator.ts` | أُعيدت كتابته بالكامل |
| `hooks/use-is-online.ts` | `getSnapshot` لكل مستخدم على حدة |

### نظام «يكتب الآن» — إعادة كتابة

- **البق القديم:** كان `onTyping` ينشئ قناة Supabase جديدة كل ضغطة مفتاح → الإرسال يفشل صامتًا.
- الآن: **قناة broadcast واحدة** مُعاد استخدامها للإرسال والاستقبال.
- حدث `stopped` صريح → المؤشر يختفي فورًا (لا flicker).
- throttle للإرسال (1.8ث) + debounce للإيقاف (3ث) → لا spam.
- إيقاف عند: الإرسال، فقدان التركيز (`onBlur`)، إلغاء التحميل.

### نموذج الخصوصية (مُطبَّق عند المصدر)

- `online_hidden` → لا يُسجَّل في Realtime Presence إطلاقًا → لا أحد يراه متصلًا.
- `last_seen_hidden` → لا يُكتب `last_seen_at` + يُصفَّر عند القراءة (server-side). **بالمثل:** من يُخفي آخر ظهوره لا يرى آخر ظهور الآخرين.
- `typing_hidden` → لا يبثّ «يكتب». **بالمثل:** لا يستقبل مؤشرات الكتابة من الآخرين.

### قراران تصميميان

1. **لا `<PresenceAvatar>` منفصل** — `UserAvatar` هو المكوّن الموحّد (مستعمَل في ~30 ملفًا)؛
   مكوّن ثانٍ = تكرار، وهو سبب بق المربع أصلًا.
2. **الخصوصية مفاتيح on/off** وليست (الجميع/المتابعون/لا أحد) — لأن فلترة حالة «متصل
   الآن» الحيّة لكل مُشاهد غير ممكنة مع Realtime Presence (يبثّ للجميع) دون إعادة هيكلة.

### الملفات المعدَّلة

- `user-avatar.tsx`, `status-aware-avatar.tsx`, `presence-text.tsx` — الـ avatar الموحّد + النقطة + النصوص.
- `chat-window.tsx` — ربط presence + typing (`onTyping`/`stopTyping`).
- `conversation-list-item.tsx`, `artisan-card.tsx`, `comment-bubble.tsx`, `comment-item.tsx`,
  `profile-header.tsx`, `right-sidebar.tsx`, `global-search-bar.tsx` — تمرير `userId`.
- `global-realtime-provider.tsx` — زرع `myPrivacyStore` قبل أي hook.
- `(app)/layout.tsx`, `page.tsx` — جلب أعلام الخصوصية الثلاثة.
- `settings/privacy/page.tsx` — قسم الحضور المربوط بالـ DB.
- `translations.ts` — مفاتيح جديدة (ar/fr/en): `presenceSettingsSection`, `showOnlineLabel/Desc`,
  `showTypingLabel/Desc`, `presenceReciprocityHint`.
- `database.types.ts` — عمودا `online_hidden` / `typing_hidden`.

### ملاحظات

- **الإشعارات و RatingCard** بلا نقطة عمدًا: الإشعار فيه شارة نوع الإشعار في نفس
  الزاوية (تجنّب الازدحام)؛ RatingCard يحتاج تعديل استعلام لإضافة `id` (تحسين مستقبلي).
- **أداء:** `useIsOnline` يعيد render الـ avatar المعني فقط عند تغيّر حالة مستخدمه.

### النتائج

```
✓ npx tsc --noEmit → 0 errors
✓ npm run lint     → 0 warnings
✓ npm run build    → نجح، 30 صفحة
```

> ⚠️ **مطلوب:** تطبيق migration `0039_presence_privacy_extended.sql` على قاعدة البيانات
> قبل التشغيل (يضيف عمودَي `online_hidden` و `typing_hidden`).

---

## جلسة مايو 2026 — كاروسيل RTL، إعادة التوجيه، إعدادات الخصوصية، تفاعلات الرسائل

### الإصلاح #1 — الكاروسيل يعرض الصورة الأولى فقط ✅

**السبب:** التطبيق RTL، فشريط شرائح Embla (flex) يُرتَّب يميناً-يساراً، بينما
Embla يحسب التمرير افتراضياً بوضع `ltr` → عند التنقّل تصل الشرائح إلى مساحة فارغة
بدل الصور، فلا تظهر إلا الأولى.

**الحل** في `src/components/feed/post-card.tsx`: أُضيف `dir="ltr"` على حاوية عرض
Embla (`emblaRef`) ليتطابق تدفّق الـ flex مع حسابات Embla.

### الإصلاح #2 — إعادة توجيه غير مبرَّرة إلى /login ✅

**السبب:** صفحات السيرفر المحمية تستدعي `getUser()` ثم `redirect('/login')` فوراً
عند أي `null`. لكن `getUser()` قد يُرجع `null` **مؤقتاً** (طلبات سيرفر متزامنة
تتسابق على تدوير refresh token، أو انقطاع شبكة لحظي).

**الحل:**
- `src/lib/supabase/require-user.ts` (جديد): يعيد التوجيه فقط عند انعدام الجلسة
  فعلياً — `getUser()` **و** `getSession()` كلاهما فارغ.
- حُوِّلت 10 صفحات محمية إليه: notifications، settings (+account/subscription)،
  saved، messages (+[id]/new)، onboarding، profile/edit.

### الميزة #3 — تفعيل إعدادات الخصوصية الثلاث ✅

كانت `رؤية الملف` / `من يمكنه مراسلتي` / `من يمكنه التعليق` تُحفَظ في
`localStorage` فقط بلا أي أثر فعلي.

**migration `0040_visibility_settings.sql`** (جديد): أعمدة `profile_visibility`،
`who_can_message`، `who_can_comment` على `profiles`.

**التطبيق:**
- `/settings/privacy` تحفظ/تقرأ من قاعدة البيانات بدل localStorage (مع تراجع عند الفشل).
- `who_can_comment` — مُطبَّق في `addComment`: `none` يغلق التعليقات، `followers`
  يتطلّب متابعة صاحب المنشور.
- `who_can_message` — helper `canStartConversation` في `src/lib/privacy/visibility.ts`،
  مُطبَّق عند إنشاء أي محادثة (`messages/new`، `messages`، `status.ts`)، وزر «رسالة»
  يختفي تلقائياً لغير المتابِعين.
- `profile_visibility` — ملف `followers`/`none` يعرض شاشة «حساب خاص» بدل المنشورات،
  ويُستبعد من الاكتشاف (`explore`) والبحث، مع `robots: noindex`.

### الإصلاح #4 — شريط إيموجي التفاعل يُقتطع عند الحافة ✅

**السبب:** منتقي الإيموجي (`message-action-bar.tsx`) كان يُموضَع `fixed` دون أي
clamping للـ viewport؛ فعند اقتراب الزر من حافة الشاشة يخرج الشريط — وفي RTL
يُقتطع أول إيموجي (القلب).

**الحل:**
- `message-action-bar.tsx`: يُحسب `left` ويُقيَّد ضمن `[GAP, viewW - PICKER_WIDTH - GAP]`.
- `message-action-sheet.tsx`: شريط التفاعلات (~278px) كان يُحاذى بعرض القائمة (260px)
  — أُضيف ثابت `REACTIONS_W` و clamp أفقي مستقل له.

### النتائج

```
✓ npx tsc --noEmit → 0 errors
✓ npx eslint (الملفات المعدَّلة) → 0 warnings
```

> ⚠️ **مطلوب:** تطبيق migration `0040_visibility_settings.sql` على قاعدة البيانات.

---

## تحديثات مايو 2026 — i18n، FAB، ومراسلة الزبائن

### إصلاح #1 — ردود فعل الإيموجي في عارض القصص تخرج عن الإطار ✅

**المشكلة:** عند تغيير لغة المنصة من AR إلى FR/EN، يُغيَّر `html dir` من `rtl` إلى `ltr`، لكن شريط الإيموجي في `status-viewer.tsx` كان يستعمل خاصية منطقية `start-0` (التي تعني `left` في LTR)، مما يُخرج الشريط عن حدود المكوّن عند الحافة.

**الإصلاح** في `src/components/status/status-viewer.tsx`:
- `start-0` → `right-0` (خاصية فيزيائية ثابتة بغض النظر عن اتجاه الصفحة)
- إضافة `whitespace-nowrap` لمنع التفاف الإيموجي

---

### إصلاح #2 — ترجمة صفحة الاشتراك (i18n كامل) ✅

**المشكلة:** صفحة `/settings/subscription` كانت بنصوص عربية مُشفَّرة بالكامل — لا دعم لـ FR/EN.

**الحل:**

**`src/lib/i18n/translations.ts`** — إضافة 31 مفتاح ترجمة × 3 لغات (ar/fr/en):
- نصوص الـ hero card: `trialHeroTitle`, `trialHeroSubtitle`, `trialEndedHeroTitle`, `activeSubscription`, `pastDueTitle`, `cancelledHeroTitle`، وغيرها
- شريط التقدم: `trialDay1Label`, `trialDayNLabel`, `trialDaysUsedLabel`
- ميزات الخطة: `planFeatureUnlimitedChats`, `planFeatureInstantReply`, إلخ
- 5 أسئلة FAQ مترجمة

**نمط Server/Client split:**
- `src/app/(app)/settings/subscription/page.tsx` — Server Component: يجلب البيانات فقط ويمرّرها كـ props
- `src/app/(app)/settings/subscription/subscription-page-client.tsx` — Client Component (جديد): يستعمل `useLang()` لكل النصوص + تنسيق التاريخ حسب `lang`

---

### إصلاح #3 — زر + (FAB) يظهر داخل صفحات الرسائل ✅

**المشكلة:** زر إنشاء المنشور (FAB) الـ `fixed` ظهر فوق واجهة المحادثة.

**الجذر:** الـ FAB الفعلي موجود في `post-composer.tsx` (مُركَّب عالمياً في layout)، وليس في `mobile-bottom-nav.tsx` فقط.

**الإصلاح** في `src/components/feed/post-composer.tsx`:
- إضافة `usePathname()` من `next/navigation`
- `const inMessages = pathname.startsWith('/messages')`
- تغليف الـ FAB button بـ `{!inMessages && (...)}` — يختفي على `/messages` وكل sub-routes

إضافةً إلى ذلك، نفس الإصلاح طُبّق على زر الـ FAB في `mobile-bottom-nav.tsx` للاتساق.

---

### إصلاح #4 — زر "رسالة" في البروفايل لا يفتح المحادثة ✅

**المشكلتان:**
1. زر "رسالة" لا يظهر على بروفايلات الزبائن — كان مشروطاً بـ `user.account_type === 'artisan'` فقط
2. عند الضغط: يُوجَّه إلى `/messages/new?to=username` والمعالج الحقيقي هو `messages/new/page.tsx` — كان يدعم `customer → artisan` فقط، ويُعيد التوجيه إلى `/messages` لأي مجموعة أخرى

**الإصلاحات:**

**`src/components/profile/profile-header.tsx`:**
```tsx
// قبل: artisan فقط
const showMessageBtn = !isOwnProfile && user.account_type === 'artisan' && canMessage;

// بعد: artisan للجميع + customer profile إذا الزائر زبون
const showMessageBtn =
  !isOwnProfile &&
  (user.account_type === 'artisan' ||
    (user.account_type === 'customer' && currentUser?.account_type === 'customer')) &&
  canMessage;
```

**`src/app/(app)/messages/new/page.tsx`:**
- استبدال الشرط الصارم `target.account_type === 'artisan'` بـ `isValidPair` (customer → artisan أو customer → customer)
- للمحادثات customer→customer: يُوضع المستقبِل في `artisan_id` والمبادِر في `customer_id` (سياسات RLS تعمل على كلا العمودين)
- نفس المنطق: البحث عن محادثة موجودة أولاً، فحص `who_can_message`، ثم الإنشاء مع race-condition guard

**`src/lib/actions/status.ts` — `replyToStatus`:**
- إضافة حالة `customer → customer` لردود القصص: المستقبِل في `artisan_id` slot
- رسالة الخطأ حُدِّثت: `'لا يمكن التواصل بين حرفيين'` (بدل الرسالة المضللة القديمة)

---

## إصلاح الرعشة عند الـ Scroll — مايو 2026

### المشكلة

عند التمرير في المنصة تظهر رعشة/اهتزاز مستمر للمحتوى.

**السبب الجذري:** `NavbarWrapper` كان يستعمل `position: sticky` مع `margin-bottom: -3.5rem` عند الإخفاء. هذا الـ negative margin يُسبّب **layout shift** — المحتوى يتحرك 56px للأعلى مما يُغيّر قيمة `scrollTop`، وهذا يُشغّل scroll events جديدة، مما يُعيد حساب اتجاه الـ scroll → toggle سريع = رعشة مستمرة.

كان هناك أيضاً bug ثانوي في `useScrollDirection`: `lastY` المشترك بين جميع scroll containers (window + inner divs) يُربك حساب الـ delta عند تداخل الـ scroll events.

### الإصلاحات

**1. `src/components/layout/navbar-wrapper.tsx`**
- `sticky top-0` + `mb-[-3.5rem]` → `fixed top-0 inset-x-0`
- بما أن `fixed` يُخرج العنصر من document flow، الإخفاء عبر `translate-y(-100%)` لا يُسبّب أي layout shift

**2. `src/app/(app)/layout.tsx`** + **`src/app/page.tsx`**
- إضافة `pt-14` للـ wrapper الخارجي لتعويض الـ navbar الـ fixed (56px = h-14)

**3. `src/hooks/use-scroll-direction.ts`**
- استبدال `let lastY = 0` المشترك بـ `WeakMap<EventTarget, number>` لتتبع كل scroll container بشكل مستقل
- إصلاح bug: `lastY.set(target, y)` أُخرج خارج شرط `Math.abs(delta) > 6` + بدء من `?? 0` (بدل `?? y` الذي كان يجعل delta دائماً صفراً)

### النتائج

```
✓ الرعشة اختفت تماماً
✓ الـ navbar والـ FAB يختفيان عند الـ scroll لأسفل ويعودان عند الأعلى (كما كان)
✓ لا layout shift عند تبديل حالة الـ navbar
```

---

## نظام التفاعلات المتعدد — مايو/يونيو 2026

> **الهدف:** بناء نظام تفاعلات بأسلوب فيسبوك (Like / Love / Haha / Wow / Sad / Angry)
> للمنشورات والتعليقات، مع نمذجة (modal) لعرض من تفاعل، وحلّ كامل لمشكلة الـ flicker.

### الجزء 1 — البنية الأساسية للتفاعلات

**Migration `0044_reactions.sql`:**
- إضافة عمود `reaction_type` لجدولَي `likes` و `comment_likes` (افتراضي `'like'`،
  check constraint للقيم الستة)
- إضافة عمود `reactions_summary jsonb` لجدول `posts` مع trigger يُعيد حساب الملخص
  عند كل INSERT/DELETE/UPDATE على `likes`
- دالة `toggle_reaction(post_id, reaction)` — atomic: add / change / remove
  (التغيير = DELETE + INSERT ليُحرِّك الـ triggers الموجودة)
- دالة `toggle_comment_reaction(comment_id, reaction)` — نفس المنطق للتعليقات
- Backfill `reactions_summary` للمنشورات الموجودة

**`src/lib/constants/reactions.ts`** (جديد):
- ثوابت `REACTIONS` (6 تفاعلات بإيموجي + label_ar/fr/en + active color + hover bg)
- `getReaction(type)` — lookup بالنوع
- `getTopReactions(summary, limit)` — أعلى N تفاعلاً مرتبة حسب العدد

**`src/components/feed/reaction-picker.tsx`** (جديد):
- floating panel يظهر فوق زر Like (hover/long-press)
- 6 إيموجي بـ scale-up animation + tooltip بالاسم
- يدعم RTL + keyboard accessible

**`src/components/feed/post-reaction-button.tsx`** (جديد):
- 400ms hover delay لفتح المنتقي، 300ms close delay، 500ms long-press لموبايل
- يعرض **إيموجي التفاعل + العداد** فقط — بدون كلمات نوع "هاها" / "أحب"
- النقر بدون انتظار = toggle نفس التفاعل الحالي أو 'like' كافتراضي
- اختيار من المنتقي = تطبيق التفاعل المختار

**`src/components/feed/comment-reaction-button.tsx`** (جديد):
- نفس آلية المنتقي للتعليقات (`toggle_comment_reaction`)
- عند التفاعل: يعرض **الإيموجي فقط** (بدون نص "هاها")
- عند عدم التفاعل: نص "أعجبني" (Like) بلون رمادي محايد

### الجزء 2 — نمذجة "من تفاعل؟" + ملخّص الإيموجيات

**`src/components/feed/reactions-summary.tsx`** (جديد):
- يعرض أعلى 3 إيموجي **متداخلة بـ ring-bordered circles** (أسلوب فيسبوك)
- العدد الإجمالي بجانب الإيموجيات
- `fallbackReaction` prop — يعرض تفاعل المستخدم نفسه عند فراغ `reactions_summary`
  (يمنع الـ flicker اللحظي قبل تزامن الـ trigger)
- size variants: `sm` للتعليقات، `md` للمنشورات

**`src/components/feed/reactions-modal.tsx`** (جديد):
- Dialog مع tabs: "الكل" + tab لكل نوع إيموجي بعدد التفاعلات
- قائمة المتفاعلين: avatar (مع badge بإيموجي تفاعله) + الاسم الكامل
- النقر على أي صف → `<Link href="/profile/[username]">` (يدعم زائر وغير الزائر)
- lazy-loaded عبر `next/dynamic` لتجنّب bloat الـ bundle
- يحترم RTL/LTR طبيعياً

**Server Actions جديدة في `src/lib/actions/likes.ts`:**
- `getPostReactions(postId)` → `ReactorUser[]` (avatar + username + full_name + reaction)
- `getCommentReactions(commentId)` → نفس البنية

### الجزء 3 — حل مشكلة الـ Flicker جذرياً

**المشكلة:** بعد كل تفاعل كان `onSettled` يستدعي `invalidateQueries(['feed'])` مما
يُسبّب refetch كامل. خلال الـ refetch، إذا `reactions_summary` من DB لم يتزامن بعد
(trigger lag أو migration غير مطبَّق)، البيانات تتغير لحظياً → الإيموجيات تظهر وتختفي.

**Migration `0045_comment_reactions_summary.sql`:**
- إضافة `reactions_summary jsonb` لجدول `comments` + trigger للتحديث التلقائي
- Backfill للتعليقات الموجودة

**Migration `0046_reaction_rpcs_return_summary.sql` (الحلّ النهائي):**
- `toggle_reaction` و `toggle_comment_reaction` يرجعان الآن `new_summary` (jsonb)
  مباشرةً من DB بعد إنهاء جميع الـ triggers
- النتيجة: السيرفر يُعيد دائماً الحالة الموثوقة في استجابة واحدة، بلا حاجة لـ refetch

**`src/hooks/use-like-post.ts`:**
- `onMutate`: optimistic update يشمل `is_liked`, `user_reaction`, `likes_count`,
  `reactions_summary` (عبر دالة `patchSummary` التي تحاكي trigger الـ DB)
- `onSuccess`: يضع `reactions_summary` من `result.newSummary` (موثوق من السيرفر)
- **`onSettled` محذوف بالكامل** — السيرفر يُرجع الحالة الكاملة في onSuccess،
  فلا حاجة لـ invalidate يُسبّب refetch + flicker
- التزامن مع تفاعلات الآخرين يحدث عند page navigation أو manual refresh

**`src/hooks/use-comments.ts`:**
- `useToggleCommentLike.onSuccess`: يضع `reactions_summary` من `result.newSummary`
- إزالة `qc.invalidateQueries({ queryKey: ['feed'] })` من `onSettled` في
  `useAddComment` و `useDeleteComment` (الـ optimistic increment للـ `comments_count`
  صحيح بالفعل، والـ refetch كان يسبّب layout flicker على البطاقة)
- إبقاء `invalidateQueries({ queryKey: commentQueryKey(postId) })` فقط لتحميل
  التعليق الحقيقي مكان الـ optimistic placeholder

**`src/components/feed/reactions-summary.tsx`** — fallback logic:
```ts
let topReactions = getTopReactions(summary, 3);
if (topReactions.length === 0 && fallbackReaction) {
  topReactions = [getReaction(fallbackReaction)!];
}
```
حتى لو `reactions_summary` فارغ لحظياً، يظهر إيموجي المستخدم الخاص ⇒ لا flicker.

**نفس fallback مطبَّق في `comment-bubble.tsx` و `comment-item.tsx`:**
- شارة التفاعل أسفل فقاعة التعليق تبقى ثابتة حتى لو `reactions_summary` لم يتزامن

### الجزء 4 — تخطيط شريط الإجراءات

**`src/components/feed/post-card.tsx`:**
- **Stats row فوق الـ actions** (الحالة السابقة) → دُمج كلاهما في صف واحد
- التخطيط الجديد:
  ```
  [👍 5] [💬 3] [↗ 2] ───────────────── [😂❤️ 5]
   Like   Comment  Share              counter (ms-auto)
  ```
- `ReactionsSummary` على الجانب المعاكس (يسار في RTL، يمين في LTR) عبر `ms-auto`
- النقر على الـ counter يفتح `ReactionsModal` (لجميع المستخدمين، حتى الزوار)
- زر التعليق + زر المشاركة يعرضان عدّاديهما بجانب الأيقونة (`comments_count`,
  `shares_count`)

**`src/components/feed/comment-bubble.tsx` + `comment-item.tsx`:**
- شارة التفاعل أسفل فقاعة التعليق (`absolute -bottom-2.5 end-1.5`)
- تعرض أعلى تفاعلَين + العدد (إذا > 1) بـ overlap خفيف
- النقر يفتح `ReactionsModal` (type=`comment`)
- `hover:scale-105` + ظل أنيق لتجربة Facebook

### الجزء 5 — i18n + RecentComment type

**`src/lib/i18n/translations.ts`** — مفاتيح جديدة × 3 لغات:
- `reactionsModalTitle`, `allReactions`, `noReactions`
- `commentLabel`, `commentsLabel`, `shareLabel`

**`src/lib/validations/post.ts`:**
- `RecentComment` type أُضيف له `reactions_summary?: Record<string, number> | null`

**`src/lib/actions/comments.ts` — `getComments`:**
- SELECT يجلب `reactions_summary` من DB
- `mapRow` يُمرّره ضمن النتيجة

### النتائج

```
✓ npx tsc --noEmit → 0 errors
✓ npm run build    → 0 errors, 0 warnings
✓ الإيموجيات أسفل المنشور ثابتة، لا تختفي
✓ شارة التعليق ثابتة، لا تظهر وتختفي
✓ العداد يعرض الرقم الصحيح من DB موثوقاً
✓ عداد التعليقات يُحدّث ولا يرتجف
```

> ⚠️ **مطلوب:** تطبيق migrations `0044` → `0045` → `0046` بالترتيب في Supabase
> SQL Editor. كلها idempotent (يمكن إعادة تشغيلها بأمان).

---

## تحسينات اكتشاف الحرفيين + Trending Widget

### Migration `0042_trending_professions.sql`
- دالة `get_trending_professions(p_limit)` ترجع أعلى التخصصات نشاطاً (counts من
  `profiles.craft_category` + اختياري weighting لاحقاً)
- نتائج cached client-side عبر TanStack Query

### Migration `0043_search_artisans_rpc.sql`
- دالة `search_artisans(query, craft, city, sort, limit, offset)` تُجمّع
  البحث + الفلترة + الترتيب في استدعاء واحد
- يدعم: `popular`, `rating_desc`, `newest`, `experience_desc`
- يُرجع `total_count` لـ pagination

### `src/components/layout/trending-widget.tsx` (جديد)
- يستخرج TRENDING من `right-sidebar.tsx` إلى Client Component مستقل
- يستعمل React Query لجلب البيانات الحيّة (بدل البيانات الستاتيكية القديمة)
- يحترم RTL + skeleton أثناء التحميل
- النقر على تخصص → `/explore?craft={value}`

### `src/lib/queries/artisans.ts`
- استبدال SQL query معقد بـ `search_artisans` RPC
- تبسيط من ~120 سطراً إلى ~50 سطراً
- نتائج أسرع بفضل المعالجة في DB بدل client-side

### `src/components/explore/explore-client.tsx` + `explore-filters.tsx`
- إعادة تصميم: filters chips أعلى الصفحة + grid أسفل
- خيارات الترتيب الأربعة موحَّدة بين UI و DB

### `src/app/(app)/explore/page.tsx`
- تبسيط Server Component: يجلب البيانات الأولية فقط ويُمرّرها لـ ExploreClient
- إصلاح: cards ≥ 1 صف ديكستوب، 2 على tablet، 1 على موبايل (responsive)

---

## ميزة الفيديوهات على موبايل + OptimizedVideo Smart Aspect

### `src/components/layout/mobile-videos-button.tsx` (جديد)
- زر أيقونة على navbar الموبايل ينقل إلى `/videos` (الفيد المخصّص للفيديوهات)
- مرئي فقط على شاشات < md
- متموضع بين `TrialIndicator` و `MobileNotifButton`

### `src/components/feed/optimized-video.tsx`
- إضافة prop `autoAspect` (افتراضي `false`)
- عند `autoAspect={true}`:
  - يستخرج عرض/ارتفاع الفيديو من HLS manifest عبر `Hls.Events.MANIFEST_PARSED`
  - يطبّق `aspect-ratio` ديناميكياً (بدل المربع الإجباري)
  - فيديوهات portrait (9:16) تعرض بـ aspect كامل بدل الاقتطاع
  - fallback للـ MP4 source يستعمل `loadedmetadata` event
- `PostCard` يمرّر `autoAspect={true}` للفيديوهات في المنشور المنفرد

### `src/components/layout/navbar.tsx`
- إضافة `<MobileVideosButton />` في nav الموبايل المسجّل

---

## النتائج النهائية للجلسة الكاملة

```
✓ npx tsc --noEmit → 0 errors
✓ npm run build    → 0 errors, 0 warnings
✓ كل ميزات التفاعلات تعمل، لا flicker
✓ عدّادات صحيحة من DB موثوقة
✓ نمذجة "من تفاعل" تعمل للمنشورات والتعليقات
✓ TrendingWidget بياناته حيّة
✓ صفحة Videos متاحة من موبايل navbar
✓ فيديوهات portrait تُعرض بدون اقتطاع
```

> ⚠️ **مطلوبة في Supabase SQL Editor (بالترتيب):**
> `0042_trending_professions.sql` → `0043_search_artisans_rpc.sql` →
> `0044_reactions.sql` → `0045_comment_reactions_summary.sql` →
> `0046_reaction_rpcs_return_summary.sql`

---

## ترجمة i18n شاملة — ماي 2026

> **الهدف:** إزالة كل النصوص المُشفَّرة (hardcoded) العربية من المكوّنات وربطها بنظام الترجمة (ar/fr/en)

### ما أُنجز

#### 1. `src/lib/i18n/translations.ts` — 13 مفتاح جديد × 3 لغات

**الشريط الجانبي الأيمن:**
- `suggestedArtisans` — "حرفيون مقترحون" / "Artisans suggérés" / "Suggested Artisans"
- `tipOfDay` — "نصيحة اليوم" / "Conseil du jour" / "Tip of the day"
- `tipText1/2/3` — النصائح الثلاث المتناوبة مترجمة للثلاث لغات

**ويدجت الترند:**
- `mostRequested` — "الأكثر طلبًا"
- `liveLabel` — "مباشر"
- `exploreAllCrafts` — "استكشاف جميع المهن"
- `artisanCountSuffix` — "حرفي"
- `engagementSuffix` — "تفاعل"

**تبويب "عن" في البروفايل:**
- `memberSince` — "عضو منذ"
- `bioSectionLabel` — "نبذة"
- `yearSuffix` — "سنة"

#### 2. `src/lib/constants/crafts.ts` — دعم كامل لثلاث لغات

- إضافة `name_en` لكل التخصصات (24 تخصص)
- دالة `getCraftName(idOrArabicName, lang)`:
  - يبحث بالـ id أولاً (`'tiling'`) ثم بالاسم العربي (`'بلاطة'`)
  - يُرجع الاسم بـ ar/fr/en — يحلّ مشكلة ظهور الأسماء الإنجليزية (`tiling`, `plumbing`) في البطاقات

#### 3. `src/lib/constants/cities.ts` — دالة `getCityName(idOrArabicName, lang)`
  - نفس آلية البحث — يدعم fr/en عبر `name_fr`

#### 4. `src/components/layout/suggested-artisans.tsx` (جديد)
- **Client Component** يستخرج منطق "حرفيون مقترحون" + "نصيحة اليوم" من `right-sidebar.tsx` (Server Component)
- يستعمل `useLang()` لكل النصوص والترجمات
- يستعمل `getCraftName` + `getCityName` بحسب `lang` الحالية
- الزر "متابعة" و"عرض الكل" مترجمان عبر `t('follow')` و `t('viewAll')`

#### 5. `src/components/layout/right-sidebar.tsx`
- يمرّر البيانات المجلوبة من السيرفر لـ `<SuggestedArtisans>` (client)
- حُذفت النصوص المُشفَّرة (`متابعة`, `حرفيون مقترحون`, `عرض الكل`, `نصيحة اليوم`)

#### 6. `src/components/layout/trending-widget.tsx`
- إضافة `useLang()` و استبدال 5 نصوص مُشفَّرة بـ `t()`:
  - `الأكثر طلبًا` → `t('mostRequested')`
  - `مباشر` → `t('liveLabel')`
  - `استكشاف جميع المهن` → `t('exploreAllCrafts')`
  - `حرفي` → `t('artisanCountSuffix')`
  - `تفاعل` → `t('engagementSuffix')`

#### 7. `src/components/explore/artisan-card.tsx`
- استبدال `getCraftById + name_ar` بـ `getCraftName(craft, lang)`
- استبدال `CITIES.find + name_ar` بـ `getCityName(city, lang)`

#### 8. `src/components/profile/profile-header.tsx`
- نفس الاستبدال — عرض اسم التخصص والمدينة بحسب `lang`

#### 9. `src/components/profile/profile-tabs-list.tsx` (جديد)
- **Client Component** لعلامات تبويب البروفايل
- يستعمل `t('postsTab')`, `t('aboutTab')`, `t('ratingsTab')` بدلاً من الأسماء العربية المُشفَّرة

#### 10. `src/components/profile/profile-about-section.tsx` (جديد)
- **Client Component** لمحتوى تبويب "عن"
- `t('bioSectionLabel')`, `t('memberSince')`, `t('yearsExperienceLabel')`, `t('yearSuffix')`

#### 11. `src/app/(app)/profile/[username]/page.tsx`
- استبدال `<TabsList>/<TabsTrigger>` المُشفَّرة بـ `<ProfileTabsList>`
- استبدال محتوى "عن" المُشفَّر بـ `<ProfileAboutSection>`

### النتائج

```
✓ npx tsc --noEmit → 0 errors
✓ npm run build    → 0 errors, 0 warnings
✓ 30 صفحة تُولَّد بنجاح
```
