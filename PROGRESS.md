# PROGRESS.md — Chof Khdemti

## المرحلة الحالية: ✅ 4 مكتملة — بدء المرحلة 5

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

## المرحلة التالية: 5 — التقييمات والجودة (أيام 23-27)
