# CLAUDE.md — Chof Khdemti Platform

> **ملف توجيهي شامل لـ Claude Code**
> هذا الملف هو المرجع الرئيسي لبناء منصة Chof Khdemti. اقرأه بالكامل قبل البدء بأي مهمة، وارجع إليه عند أي قرار تقني أو معماري.

---

## 📌 جدول المحتويات

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [نموذج الربح (التحديث المهم)](#2-نموذج-الربح-التحديث-المهم)
3. [المبادئ الأساسية للتطوير](#3-المبادئ-الأساسية-للتطوير)
4. [المكدس التقني (Tech Stack)](#4-المكدس-التقني-tech-stack)
5. [هيكل المشروع (Project Structure)](#5-هيكل-المشروع-project-structure)
6. [مخطط قاعدة البيانات](#6-مخطط-قاعدة-البيانات)
7. [متغيرات البيئة (Environment Variables)](#7-متغيرات-البيئة-environment-variables)
8. [معايير الكود والجودة](#8-معايير-الكود-والجودة)
9. [المراحل الستّ للتطوير](#9-المراحل-الستّ-للتطوير)
10. [تعليمات Claude Code أثناء العمل](#10-تعليمات-claude-code-أثناء-العمل)
11. [الأمان و Row Level Security](#11-الأمان-و-row-level-security)
12. [الاختبارات](#12-الاختبارات)
13. [قواعد الـ Git و Commits](#13-قواعد-الـ-git-و-commits)
14. [قائمة ممنوعات ومحرمات](#14-قائمة-ممنوعات-ومحرمات)

---

## 1. نظرة عامة على المشروع

**Chof Khdemti** هي منصة اجتماعية متخصصة للحرفيين وأصحاب الخدمات في المغرب والعالم العربي. تمكّن الحرفيين من:

- نشر أعمالهم عبر الصور والفيديوهات
- بناء ملف شخصي احترافي وسمعة رقمية
- استقبال طلبات واستفسارات الزبائن عبر محادثة فورية
- التفاعل داخل مجتمع مخصص لهم بدل فيسبوك العام

**المستخدمون:** نوعان من الحسابات
- `artisan` (حرفي / مقدم خدمة): ينشر الأعمال، يستقبل رسائل، يدفع اشتراكاً شهرياً
- `customer` (زبون): يتصفح، يتابع، يرسل رسائل، يكتب تقييمات

**المنطقة المستهدفة:** المغرب أولاً، ثم توسع للعالم العربي
**اللغة الأساسية:** العربية (RTL) مع دعم الفرنسية لاحقاً
**الهدف:** MVP جاهز للإطلاق خلال 4 أسابيع

---

## 2. نموذج الربح (التحديث المهم)

> ⚠️ **هذا الجزء تم تعديله عن الخطة الأولى. اعتمد هذا النموذج الجديد فقط.**

### 2.1 النموذج: اشتراك شهري للحرفيين

- **السعر:** `99 MAD / شهر` للحرفي الواحد
- **الزبون (customer):** مجاناً بالكامل. لا يدفع شيئاً.
- **بوابة الدفع:** **Lemon Squeezy** (وليس Stripe)

### 2.2 آلية المحادثات (Quota System)

- كل حرفي يحصل على **5 محادثات مجانية** (conversation quota) دائماً كنافذة تجريبية
- "المحادثة" = تواصل (أخذ ورد) كامل مع زبون واحد (threaded conversation)
- عند استنفاذ الـ 5 محادثات، الحرفي **لا يستطيع الرد** على أي زبون جديد حتى يشترك
- بعد الاشتراك النشط (`subscription_status = 'active'`): محادثات غير محدودة طوال فترة الاشتراك
- إذا انتهى الاشتراك أو أُلغي: يعود الحرفي إلى وضع "read-only" (يقرأ رسائل الزبائن لكن لا يرد على محادثات جديدة)

### 2.3 قاعدة العدّ المهمة

- المحادثات المجانية الخمس تُحسب **مرة واحدة فقط لكل زبون**
- أي: إذا بدأ الزبون A محادثة، ثم عاد بعد شهر وأرسل مجدداً، يظل ذلك ضمن **نفس المحادثة** ولا يُحسب من جديد
- العدّاد يزيد `+1` فقط عند **أول رد من الحرفي** على محادثة جديدة مع زبون لم يُراسله من قبل

### 2.4 حالات الاشتراك (Subscription States)

```
trial       → لديه quota متبقية (< 5 محادثات مستعملة)
quota_used  → استنفذ الـ 5 محادثات ولم يشترك بعد
active      → اشتراك Lemon Squeezy نشط
past_due    → فشل آخر دفع، لديه مهلة 3 أيام
cancelled   → ألغى الاشتراك، يعود لوضع read-only
```

### 2.5 تكامل Lemon Squeezy

Claude Code يجب أن:
1. يستعمل **Lemon Squeezy Checkout** (hosted checkout، لا تُبنى صفحة دفع داخلية)
2. يعتمد على **Webhooks** لتحديث حالة الاشتراك:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_payment_success`
   - `subscription_payment_failed`
3. يتحقق من توقيع Webhook عبر `X-Signature` باستخدام `LEMON_SQUEEZY_WEBHOOK_SECRET`
4. يحفظ `subscription_id` و `customer_id` من Lemon Squeezy في جدول `subscriptions`
5. يسجل كل حدث webhook في جدول `webhook_events` (idempotency)

### 2.6 جدول الاشتراكات في DB

```sql
subscriptions (
  id uuid pk,
  user_id uuid fk → users,
  lemon_subscription_id text unique,
  lemon_customer_id text,
  status enum('trial','quota_used','active','past_due','cancelled'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### 2.7 ما الذي يجب حذفه من الخطة القديمة

- ❌ جدول `wallet_accounts`
- ❌ جدول `wallet_transactions`
- ❌ صفحة `/wallet`
- ❌ زر "اشحن رصيدك"
- ❌ أي منطق خصم بالدرهم من المحفظة
- ✅ استُبدلت كلها بجداول: `subscriptions`, `conversation_quota`, `webhook_events`

---

## 3. المبادئ الأساسية للتطوير

عند كتابة أي كود أو اتخاذ أي قرار، Claude Code يلتزم بهذه المبادئ:

### 3.1 البساطة أولاً (Simplicity First)
- لا تُضف أي مكتبة إلا إذا كانت ضرورية. راجع المكدس المُعتمد في القسم 4 أولاً.
- لا تبنِ abstractions مبكراً. ابدأ بالحل المباشر ثم ارفع مستوى التجريد إذا تكرر الاحتياج ≥ 3 مرات.
- ملف واحد يفعل شيئاً واحداً. إذا تخطى الملف 300 سطر، قسّمه.

### 3.2 الأمان ليس اختيارياً (Security Non-Negotiable)
- كل جدول في Supabase **يجب** أن يكون عليه RLS مُفعّل من اليوم الأول
- لا تكتب استعلاماً مباشراً للـ DB من client بدون المرور بـ RLS policies
- متغيرات البيئة الحساسة (webhook secrets, service role keys) لا تُستعمل إلا في Server Actions أو Route Handlers

### 3.3 الأداء من البداية (Performance by Default)
- استخدم Server Components كـ default. لا تُحوّل لـ Client Component إلا عند الحاجة للتفاعلية
- الصور: دائماً عبر `next/image` أو Cloudinary مع `f_auto,q_auto`
- قوائم طويلة: pagination أو infinite scroll، لا تجلب أكثر من 20 عنصر في الدفعة
- استخدم TanStack Query للـ caching بدل useEffect + fetch

### 3.4 RTL أولاً
- التطبيق بالكامل RTL. استخدم `dir="rtl"` على `<html>` وخصائص Tailwind المنطقية (`ms-*`, `me-*`, `ps-*`, `pe-*`) بدل (`ml-*`, `mr-*`, `pl-*`, `pr-*`)
- الأرقام بالصيغة الغربية (1, 2, 3) وليس العربية الشرقية (١، ٢، ٣) لتسهيل القراءة
- التاريخ بصيغة `dd/MM/yyyy` بالفرنسية/الإنجليزية

### 3.5 تجربة الموبايل أولاً
- صمّم لشاشة 375px ثم وسّع. أغلب الحرفيين سيستعملون الهاتف
- أزرار بحجم لا يقل عن 44x44px
- فورم مُبسط، خطوة واحدة في كل شاشة عند الـ onboarding

---

## 4. المكدس التقني (Tech Stack)

### 4.1 Frontend

| التقنية | الإصدار | الاستعمال |
|---------|---------|-----------|
| Next.js | 15.x (App Router) | إطار العمل الرئيسي |
| React | 19.x | مكتبة UI |
| TypeScript | 5.x (strict mode) | لغة الكود |
| Tailwind CSS | 4.x | التنسيق |
| shadcn/ui | latest | مكونات UI جاهزة |
| TanStack Query | 5.x | إدارة حالة السيرفر |
| react-hook-form + zod | latest | الفورمات والتحقق |
| lucide-react | latest | الأيقونات |
| date-fns | 3.x | التعامل مع التواريخ |
| sonner | latest | Toast notifications |

### 4.2 Backend & Database

| التقنية | الاستعمال |
|---------|-----------|
| Supabase | Auth + PostgreSQL + Realtime + Storage |
| @supabase/ssr | التكامل مع Next.js App Router |
| PostgreSQL | قاعدة البيانات (عبر Supabase) |
| Supabase RLS | طبقة الأمان الأساسية |

### 4.3 Media & Payments

| التقنية | الاستعمال |
|---------|-----------|
| Cloudinary | رفع ومعالجة الصور والفيديو |
| next-cloudinary | React SDK لـ Cloudinary |
| **Lemon Squeezy** | بوابة الدفع والاشتراكات (بديل Stripe) |
| @lemonsqueezy/lemonsqueezy.js | Node SDK الرسمي |

### 4.4 Deployment & Monitoring

| التقنية | الاستعمال |
|---------|-----------|
| Vercel | الاستضافة والنشر |
| Vercel Analytics | تحليلات الزيارات |
| Sentry | تتبع الأخطاء (Phase 6) |
| GitHub Actions | CI أساسي |

### 4.5 Testing

| التقنية | الاستعمال |
|---------|-----------|
| Vitest | اختبارات الوحدة |
| @testing-library/react | اختبار المكونات |
| Playwright | E2E (اختياري في المرحلة 5) |

---

## 5. هيكل المشروع (Project Structure)

```
Chof Khdemti/
├── CLAUDE.md                          ← هذا الملف
├── README.md
├── .env.local                         ← (في .gitignore)
├── .env.example                       ← نموذج للمتغيرات بدون قيم
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── middleware.ts                      ← حماية المسارات + refresh session
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 ← RTL + Providers
│   │   ├── page.tsx                   ← Landing page
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/                    ← Route group للمصادقة
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── onboarding/page.tsx
│   │   │
│   │   ├── (app)/                     ← Route group للتطبيق
│   │   │   ├── layout.tsx             ← Navbar + Sidebar
│   │   │   ├── feed/page.tsx
│   │   │   ├── explore/page.tsx
│   │   │   ├── profile/[username]/page.tsx
│   │   │   ├── messages/
│   │   │   │   ├── page.tsx           ← قائمة المحادثات
│   │   │   │   └── [conversationId]/page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── subscription/page.tsx  ← إدارة الاشتراك
│   │   │   └── post/[id]/page.tsx
│   │   │
│   │   └── api/
│   │       ├── lemon/
│   │       │   ├── checkout/route.ts      ← إنشاء رابط الدفع
│   │       │   └── webhook/route.ts       ← استقبال Webhooks
│   │       ├── cloudinary/
│   │       │   └── sign/route.ts          ← توقيع رفع الصور
│   │       └── og/
│   │           └── [username]/route.tsx   ← OG image ديناميكية
│   │
│   ├── components/
│   │   ├── ui/                        ← shadcn components
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── feed/
│   │   │   ├── post-card.tsx
│   │   │   ├── post-composer.tsx
│   │   │   └── comment-list.tsx
│   │   ├── profile/
│   │   │   ├── profile-header.tsx
│   │   │   └── profile-stats.tsx
│   │   ├── messages/
│   │   │   ├── conversation-list.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   └── message-composer.tsx
│   │   ├── subscription/
│   │   │   ├── subscription-status-badge.tsx
│   │   │   ├── quota-indicator.tsx
│   │   │   └── upgrade-prompt.tsx
│   │   └── rating/
│   │       ├── star-rating.tsx
│   │       └── rating-form.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              ← Browser client
│   │   │   ├── server.ts              ← Server client
│   │   │   └── middleware.ts          ← Middleware helper
│   │   ├── lemon-squeezy/
│   │   │   ├── client.ts              ← SDK initialization
│   │   │   ├── checkout.ts            ← إنشاء checkout session
│   │   │   └── webhook.ts             ← التحقق من التوقيع
│   │   ├── cloudinary/
│   │   │   ├── client.ts
│   │   │   └── upload.ts
│   │   ├── queries/                   ← TanStack Query hooks
│   │   │   ├── use-feed.ts
│   │   │   ├── use-profile.ts
│   │   │   ├── use-conversations.ts
│   │   │   └── use-subscription.ts
│   │   ├── actions/                   ← Server Actions
│   │   │   ├── posts.ts
│   │   │   ├── comments.ts
│   │   │   ├── likes.ts
│   │   │   ├── follows.ts
│   │   │   ├── messages.ts
│   │   │   ├── ratings.ts
│   │   │   └── subscription.ts
│   │   ├── validations/               ← Zod schemas
│   │   │   ├── post.ts
│   │   │   ├── profile.ts
│   │   │   └── message.ts
│   │   ├── constants/
│   │   │   ├── crafts.ts              ← قائمة الـ 20+ تخصص
│   │   │   ├── cities.ts              ← مدن المغرب
│   │   │   └── subscription.ts        ← SUBSCRIPTION_PRICE, FREE_QUOTA
│   │   └── utils.ts
│   │
│   ├── types/
│   │   ├── database.types.ts          ← مُولّد من supabase gen types
│   │   └── app.types.ts
│   │
│   └── hooks/
│       ├── use-current-user.ts
│       ├── use-realtime-messages.ts
│       └── use-subscription-status.ts
│
├── supabase/
│   ├── migrations/                    ← SQL migrations مرتبة
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_functions.sql
│   │   ├── 0004_subscriptions.sql
│   │   └── 0005_quota_logic.sql
│   ├── seed.sql                       ← بيانات اختبار
│   └── config.toml
│
└── tests/
    ├── unit/
    │   ├── quota.test.ts
    │   └── subscription.test.ts
    └── e2e/
        └── signup-flow.spec.ts
```

---

## 6. مخطط قاعدة البيانات

> كل الجداول تحت schema `public` مع RLS مُفعّل. جميع الأعمدة الزمنية `timestamptz`.

### 6.1 جدول `users` (يمتد من `auth.users`)

```sql
-- مربوط بـ auth.users.id
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  account_type text not null check (account_type in ('artisan', 'customer')),
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

### 6.2 جدول `profiles`

```sql
create table public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  bio text,
  avatar_url text,
  cover_url text,
  craft_category text,           -- nullable للزبائن
  city text,
  years_experience int,
  is_verified boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

### 6.3 جدول `posts`

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  content text,
  media jsonb not null default '[]'::jsonb,  -- [{type:'image'|'video', url, thumbnail}]
  likes_count int default 0 not null,
  comments_count int default 0 not null,
  created_at timestamptz default now() not null
);

create index posts_author_id_idx on posts(author_id);
create index posts_created_at_idx on posts(created_at desc);
```

### 6.4 جدول `comments`

```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null
);
```

### 6.5 جدول `likes`

```sql
create table public.likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, post_id)
);
```

### 6.6 جدول `follows`

```sql
create table public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
```

### 6.7 جدول `conversations`

```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.users(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  last_message_at timestamptz default now() not null,
  first_artisan_reply_at timestamptz,   -- متى ردّ الحرفي لأول مرة (لحساب الـ quota)
  created_at timestamptz default now() not null,
  unique (artisan_id, customer_id)
);
```

### 6.8 جدول `messages`

```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

create index messages_conversation_id_idx on messages(conversation_id, created_at desc);
```

### 6.9 جدول `ratings`

```sql
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.users(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now() not null,
  unique (artisan_id, customer_id)   -- تقييم واحد فقط لكل زبون
);
```

### 6.10 جدول `subscriptions` (جديد - بدل المحفظة)

```sql
create type subscription_status as enum (
  'trial',        -- لديه quota متبقية
  'quota_used',   -- استنفذ الـ 5 ولم يشترك
  'active',       -- اشتراك فعّال
  'past_due',     -- فشل الدفع
  'cancelled'     -- ألغى
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lemon_subscription_id text unique,
  lemon_customer_id text,
  lemon_variant_id text,
  status subscription_status not null default 'trial',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id)
);
```

### 6.11 جدول `conversation_quota` (جديد - لعدّ المحادثات الخمس)

```sql
-- سجل المحادثات المحسوبة من الـ quota لكل حرفي
-- كل row يمثّل "استهلاك" فتحة محادثة مع زبون جديد
create table public.conversation_quota (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  consumed_at timestamptz default now() not null,
  unique (artisan_id, conversation_id)  -- محادثة واحدة = حسبة واحدة
);

create index cq_artisan_idx on conversation_quota(artisan_id);
```

### 6.12 جدول `webhook_events` (للـ idempotency)

```sql
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,              -- 'lemon_squeezy'
  event_id text unique not null,       -- من الـ webhook
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz default now() not null
);
```

### 6.13 Database Functions المطلوبة

```sql
-- دالة للتحقق هل الحرفي يستطيع الرد على محادثة
create or replace function public.can_artisan_reply(
  p_artisan_id uuid,
  p_conversation_id uuid
) returns boolean
language plpgsql security definer
as $$
declare
  v_status subscription_status;
  v_quota_used int;
  v_is_in_quota boolean;
begin
  -- تحقق من وجود اشتراك نشط
  select status into v_status
  from public.subscriptions
  where user_id = p_artisan_id;

  if v_status = 'active' then
    return true;
  end if;

  -- هل هذه المحادثة مُستهلَكة من الـ quota مسبقاً؟
  select exists(
    select 1 from public.conversation_quota
    where artisan_id = p_artisan_id
    and conversation_id = p_conversation_id
  ) into v_is_in_quota;

  if v_is_in_quota then
    return true;  -- يستطيع المتابعة في محادثة مفتوحة مسبقاً
  end if;

  -- احسب كم استهلك
  select count(*) into v_quota_used
  from public.conversation_quota
  where artisan_id = p_artisan_id;

  return v_quota_used < 5;
end;
$$;

-- دالة لاستهلاك فتحة quota عند أول رد من الحرفي
create or replace function public.consume_quota_on_reply()
returns trigger
language plpgsql security definer
as $$
declare
  v_artisan_id uuid;
  v_is_artisan_message boolean;
  v_already_consumed boolean;
begin
  -- هل المرسل هو الحرفي في هذه المحادثة؟
  select (c.artisan_id = new.sender_id), c.artisan_id
  into v_is_artisan_message, v_artisan_id
  from public.conversations c
  where c.id = new.conversation_id;

  if not v_is_artisan_message then
    return new;
  end if;

  -- هل سبق واستهلكنا quota لهذه المحادثة؟
  select exists(
    select 1 from public.conversation_quota
    where conversation_id = new.conversation_id
  ) into v_already_consumed;

  if v_already_consumed then
    return new;
  end if;

  -- استهلك الـ quota وسجّل أول رد
  insert into public.conversation_quota (artisan_id, conversation_id)
  values (v_artisan_id, new.conversation_id);

  update public.conversations
  set first_artisan_reply_at = now()
  where id = new.conversation_id;

  -- حدّث حالة الاشتراك إذا استنفذ
  update public.subscriptions
  set status = 'quota_used', updated_at = now()
  where user_id = v_artisan_id
  and status = 'trial'
  and (
    select count(*) from public.conversation_quota
    where artisan_id = v_artisan_id
  ) >= 5;

  return new;
end;
$$;

create trigger trg_consume_quota
after insert on public.messages
for each row execute function public.consume_quota_on_reply();

-- دالة لزيادة/إنقاص عدّادات الـ counts
create or replace function public.increment_post_likes()
returns trigger language plpgsql as $$
begin
  update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger trg_inc_likes after insert on public.likes
for each row execute function public.increment_post_likes();

-- (وبنفس المنطق للـ decrement و comments_count)
```

---

## 7. متغيرات البيئة (Environment Variables)

ملف `.env.example` يجب أن يحتوي (بدون قيم حقيقية):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # سيرفر فقط!

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=                  # سيرفر فقط
CLOUDINARY_API_SECRET=               # سيرفر فقط

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=               # سيرفر فقط
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_VARIANT_ID=            # ID الخطة الشهرية 99 MAD
LEMON_SQUEEZY_WEBHOOK_SECRET=        # لتحقق Webhook signatures

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**قواعد صارمة:**
- أي متغير **بدون** `NEXT_PUBLIC_` لا يُستعمل أبداً في ملف `use client`
- `SUPABASE_SERVICE_ROLE_KEY` لا يُستعمل إلا في API routes أو Server Actions لعمليات إدارية محدودة جداً
- `.env.local` **يجب** أن يكون في `.gitignore`

---

## 8. معايير الكود والجودة

### 8.1 TypeScript
- `strict: true` إلزامياً في `tsconfig.json`
- ممنوع `any` — استعمل `unknown` ثم narrow
- ممنوع `// @ts-ignore` — استعمل `// @ts-expect-error` مع شرح
- أنواع Supabase مُولّدة: `supabase gen types typescript --project-id XXX > src/types/database.types.ts`

### 8.2 نمط كتابة المكونات

```tsx
// ✅ صحيح
type PostCardProps = {
  post: Post;
  currentUserId: string | null;
};

export function PostCard({ post, currentUserId }: PostCardProps) {
  // ...
}

// ❌ خطأ
export default function PostCard(props: any) { ... }
```

### 8.3 Server Actions

- كل Server Action يبدأ بـ `'use server'`
- يتحقق من المصادقة أولاً
- يستعمل Zod للتحقق من inputs
- يُرجع `{ data, error }` بصيغة موحدة

```ts
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).max(10),
});

export async function createPost(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, content: parsed.data.content, media: parsed.data.mediaUrls })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}
```

### 8.4 Conventions

- أسماء الملفات: `kebab-case.tsx`
- أسماء المكونات: `PascalCase`
- أسماء الـ hooks: `useCamelCase`
- أسماء جداول DB: `snake_case` plural (`posts`, `messages`)

---

## 9. المراحل الستّ للتطوير

> كل مرحلة لها أهدافها ومخرجاتها ومعايير اكتمالها (DoD). لا تنتقل لمرحلة تالية قبل اكتمال الـ DoD السابق بالكامل.

---

### 🔵 المرحلة 1 — الأساس والبنية التحتية (أيام 1-4)

**الهدف:** إنشاء هيكل المشروع، ربط Supabase، قاعدة البيانات كاملة، المصادقة، ونشر أول نسخة على Vercel.

#### ما يجب على Claude Code أن يفعله

1. **تهيئة المشروع**
   - `npx create-next-app@latest Chof Khdemti --typescript --tailwind --app --eslint`
   - تفعيل `strict` mode في `tsconfig.json`
   - إضافة `dir="rtl"` و `lang="ar"` في `app/layout.tsx`
   - تثبيت: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `sonner`, `date-fns`
   - تهيئة shadcn/ui: `npx shadcn@latest init` ثم إضافة المكونات الأساسية (`button`, `input`, `form`, `card`, `dialog`, `avatar`, `dropdown-menu`, `toast`, `tabs`, `skeleton`)

2. **إعداد Supabase**
   - إنشاء client في `src/lib/supabase/client.ts` (browser)
   - إنشاء client في `src/lib/supabase/server.ts` (server, عبر cookies)
   - إنشاء helper في `src/lib/supabase/middleware.ts` لتحديث session

3. **Middleware**
   - `middleware.ts` في الجذر يحمي المسارات `/feed`, `/messages`, `/settings`, `/profile/me`
   - يعيد توجيه غير المسجلين إلى `/login`

4. **قاعدة البيانات**
   - كتابة migration `0001_initial_schema.sql` بجميع الجداول (حسب القسم 6)
   - كتابة `0002_rls_policies.sql` بكل الـ policies (حسب القسم 11)
   - كتابة `0003_functions.sql` بالـ triggers والدوال
   - كتابة `0004_subscriptions.sql` لجدولي `subscriptions` و `conversation_quota`
   - تشغيلها عبر Supabase CLI أو SQL Editor

5. **المصادقة**
   - صفحة `/signup` بنموذج: بريد، كلمة سر، اسم كامل، اسم مستخدم، نوع حساب (artisan/customer)
   - صفحة `/login` بنموذج: بريد، كلمة سر
   - بعد التسجيل مباشرة: إنشاء row في `users` + `profiles` + `subscriptions` (بحالة `trial` إذا كان artisan)
   - صفحة `/logout` (Server Action)

6. **النشر**
   - إنشاء مستودع GitHub
   - ربطه بـ Vercel
   - إضافة متغيرات البيئة في Vercel
   - التأكد من أن كل push إلى `main` يُنشر تلقائياً

#### معايير الاكتمال (DoD)

- [ ] `npm run dev` يعمل بدون أخطاء
- [ ] `npm run build` ينجح
- [ ] جميع جداول DB منشأة مع RLS مفعّل
- [ ] مستخدم اختباري يسجل ويدخل ويخرج بنجاح
- [ ] غير المسجل يُعاد توجيهه لـ `/login`
- [ ] Vercel تنشر تلقائياً عند كل push
- [ ] لا توجد بيانات حساسة في الكود (راجعت عبر `git log -p | grep -i "secret\|key\|password"`)
- [ ] `.env.example` موجود ومكتمل

---

### 🟣 المرحلة 2 — ملفات المستخدمين والاكتشاف (أيام 5-9)

**الهدف:** بناء ملفات شخصية كاملة، تمييز نوعَي الحساب، وصفحة اكتشاف وبحث.

#### ما يجب على Claude Code أن يفعله

1. **Onboarding**
   - صفحة `/onboarding` بخطوتين:
     - الخطوة 1: اختيار نوع الحساب (artisan / customer) بكارتين واضحتين
     - الخطوة 2 (للحرفي فقط): التخصص، المدينة، سنوات الخبرة، نبذة
     - الخطوة 2 (للزبون): المدينة، نبذة اختيارية
   - بعد الإكمال: toggle flag `onboarding_complete` ثم redirect لـ `/feed`

2. **ثوابت التخصصات والمدن**
   - `src/lib/constants/crafts.ts`: 20+ تخصص (نجارة، سباكة، كهرباء، دهان، بلاطة، ميكانيكي، خياط، حلاق، طباخ، مصور، مصمم، مُكيفات، عمال بناء، مصلح هواتف، بستاني، مهندس ديكور، سائق، مُدرّس، معلّم ياردات، حلواني، خبّاز، حلاقة سيدات، عناية بالبشرة...)
   - `src/lib/constants/cities.ts`: 20+ مدينة مغربية رئيسية

3. **الملف الشخصي**
   - صفحة `/profile/[username]`:
     - Header: صورة غلاف، avatar، اسم، @username، شارة تخصص، مدينة، متوسط التقييم (إذا حرفي)، زر متابعة
     - Tabs: "الأعمال" (المنشورات)، "عن" (البيو التفصيلي)، "التقييمات" (إذا حرفي)
     - إحصائيات: عدد المتابعين، عدد المتابَعين، عدد المنشورات
   - زر "رسالة" يظهر إذا:
     - المُشاهد `customer` والصاحب `artisan`

4. **رفع صورة Avatar/Cover**
   - استعمل Cloudinary مع signed upload (لا تكشف API secret)
   - API route `/api/cloudinary/sign` يُرجع توقيع آمن

5. **صفحة الاكتشاف**
   - `/explore`:
     - فلتر التخصص (dropdown)
     - فلتر المدينة (dropdown)
     - شريط بحث نصي (يبحث في `username`, `full_name`, `craft_category`)
     - Grid من بطاقات الحرفيين (avatar, name, craft, city, rating, followers_count)
     - Pagination أو Infinite Scroll (20 في الدفعة)

6. **الصفحة الرئيسية للمستخدمين الجدد**
   - Landing page في `/` توضح قيمة المنصة + CTA للتسجيل

#### معايير الاكتمال (DoD)

- [ ] الحرفي يكمل Onboarding في أقل من دقيقتين
- [ ] الملف الشخصي يظهر صحيحاً على موبايل وديسكتوب (RTL)
- [ ] البحث في `/explore` يُعيد نتائج في أقل من 500ms
- [ ] رفع avatar ينجح ويظهر فوراً
- [ ] الزبون لا يرى خيار إضافة تخصص مهني
- [ ] فلتر التخصص + المدينة يعملان معاً بدقة
- [ ] زر "متابعة" يعمل ويُحدّث العدّادات
- [ ] URL الملف الشخصي مبني على username وليس UUID

---

### 🟠 المرحلة 3 — الفيد الاجتماعي (أيام 10-16)

**الهدف:** بناء الفيد الرئيسي لنشر الصور والفيديوهات، والتفاعل (إعجاب/تعليق/متابعة).

#### ما يجب على Claude Code أن يفعله

1. **دمج Cloudinary للوسائط**
   - رفع عبر Upload Widget أو upload API
   - قبول: صور (jpg/png/webp) ≤ 10MB، فيديو (mp4/mov) ≤ 100MB
   - الحصول على `secure_url` + `thumbnail_url` + `duration` (للفيديو)

2. **نموذج المنشور الجديد**
   - Modal أو صفحة `/feed/new`
   - Textarea للنص (اختياري، max 2000 حرف)
   - رفع متعدد: حتى 10 وسائط في المنشور الواحد
   - Preview قبل النشر مع إمكانية الحذف والإعادة ترتيب
   - بعد النشر: يظهر فوراً في أعلى الفيد (optimistic update)

3. **الفيد الرئيسي `/feed`**
   - يعرض منشورات المتابَعين فقط (SSR أولاً، ثم TanStack Query للتحديث)
   - Infinite Scroll بـ `IntersectionObserver`
   - كل كارد منشور يعرض:
     - Header: avatar + اسم + @username + تاريخ (منذ X ساعة)
     - Media carousel (إذا أكثر من واحد)
     - محتوى النص
     - أزرار: إعجاب (قلب)، تعليق، مشاركة (copy link)
     - عدد الإعجابات والتعليقات

4. **الإعجاب (Like)**
   - Optimistic update: يتغير لون القلب فوراً
   - إذا فشل: rollback + toast خطأ
   - استعمل `useMutation` من TanStack Query مع `onMutate`

5. **التعليقات**
   - Modal أو inline expansion عند النقر على "تعليق"
   - قائمة التعليقات مع avatar + اسم + نص + تاريخ
   - فورم إضافة تعليق في الأسفل
   - إضافة تعليق = optimistic update + تحديث `comments_count`

6. **المتابعة**
   - زر "متابعة / إلغاء متابعة" على الملفات الشخصية وبطاقات Explore
   - زر "متابعة" على كل منشور في `/explore` أو صفحة هاشتاج (اختياري)

7. **فيد الاكتشاف (اختياري في المرحلة)**
   - Tab ثانٍ في `/feed` اسمه "اكتشاف" يعرض منشورات عامة مرتبة بالأحدث

#### معايير الاكتمال (DoD)

- [ ] الفيد يُحمّل في أقل من 2 ثانية (Lighthouse)
- [ ] رفع فيديو 100MB ينجح دون خطأ
- [ ] الإعجاب يظهر فوراً (optimistic)
- [ ] التعليق يظهر مباشرة بعد الإرسال
- [ ] الفيد الشخصي يعرض منشورات المتابَعين فقط
- [ ] الفيديوهات تعمل على Safari و Chrome موبايل
- [ ] Counts (likes/comments) متزامنة مع DB

---

### 🟢 المرحلة 4 — المحادثات ونظام الاشتراك (أيام 17-22)

> ⚠️ **هذه المرحلة الأكثر تعديلاً عن الخطة الأصلية.** نموذج المحفظة محذوف، ومكانه نظام Lemon Squeezy + Quota.

**الهدف:** بناء نظام محادثات فوري مع منطق quota (5 مجاناً) و Lemon Squeezy للاشتراك الشهري.

#### ما يجب على Claude Code أن يفعله

1. **بنية المحادثات**
   - صفحة `/messages`: قائمة المحادثات (آخر رسالة، unread badge)
   - صفحة `/messages/[conversationId]`: واجهة الشات
   - تنظيم: `conversations` ← `messages`

2. **بدء محادثة جديدة**
   - الزبون يضغط "رسالة" في ملف حرفي → يفتح `/messages/new?to=@username`
   - إذا لا توجد محادثة سابقة بينهما: تُنشأ row في `conversations`
   - الزبون يكتب رسالة أولى. الحرفي يراها فوراً.

3. **Realtime**
   - استعمل Supabase Realtime channel لكل محادثة:
     ```ts
     const channel = supabase
       .channel(`conv:${conversationId}`)
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, handleNew)
       .subscribe();
     ```
   - الغاء الـ subscription في `useEffect` cleanup

4. **منطق الـ Quota (قرار Claude Code الحاسم)**
   - **قبل إرسال أي رسالة من الحرفي**: استدعِ الدالة `can_artisan_reply(artisan_id, conversation_id)` عبر RPC
   - إذا أرجعت `false`: اعرض `<UpgradePrompt />` بدل فورم الإرسال
   - إذا أرجعت `true`: اسمح بالإرسال. الـ trigger `trg_consume_quota` سيستهلك quota تلقائياً عند أول رد

5. **عرض حالة الـ Quota للحرفي**
   - في Navbar: badge صغيرة تعرض `3/5 محادثات متبقية` (إذا `trial`) أو `اشتراك نشط` (إذا `active`)
   - مكون `<QuotaIndicator />` يستعمل hook `useSubscriptionStatus`

6. **Lemon Squeezy - Checkout**
   - API Route: `POST /api/lemon/checkout`
     - يستقبل `user_id` من session
     - يُنشئ checkout session عبر SDK:
       ```ts
       import { createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
       const { data } = await createCheckout(storeId, variantId, {
         checkoutData: {
           email: user.email,
           custom: { user_id: user.id }
         },
         productOptions: { redirectUrl: `${APP_URL}/settings/subscription?success=1` }
       });
       return { url: data.data.attributes.url };
       ```
   - زر "اشترك الآن (99 درهم/شهر)" يستدعي هذا الـ API ثم `window.location = url`

7. **Lemon Squeezy - Webhook**
   - API Route: `POST /api/lemon/webhook`
   - يتحقق من التوقيع:
     ```ts
     const signature = request.headers.get('x-signature');
     const body = await request.text();
     const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!);
     const digest = hmac.update(body).digest('hex');
     if (digest !== signature) return new Response('Invalid signature', { status: 401 });
     ```
   - يتحقق من عدم معالجة الحدث من قبل (`webhook_events.event_id`)
   - يعالج حسب `event_name`:
     - `subscription_created` / `subscription_resumed` → `status = 'active'`
     - `subscription_payment_success` → تحديث `current_period_end`
     - `subscription_payment_failed` → `status = 'past_due'`
     - `subscription_cancelled` → `status = 'cancelled'`
     - `subscription_expired` → `status = 'cancelled'`
   - **استعمل `SUPABASE_SERVICE_ROLE_KEY`** للتعديل (تجاوز RLS)

8. **صفحة الاشتراك**
   - `/settings/subscription`:
     - الحالة الحالية (trial / active / past_due / cancelled)
     - عدد المحادثات المستهلكة (إذا trial)
     - زر "اشترك" (إذا ليس active)
     - زر "إدارة الاشتراك" يفتح Customer Portal من Lemon Squeezy (إذا active)
     - زر "إلغاء" (يضع `cancel_at_period_end`)

9. **Notification Badge**
   - في Navbar: أيقونة رسائل مع عدد غير المقروء
   - Realtime subscription على كل محادثات المستخدم

#### معايير الاكتمال (DoD)

- [ ] رسالة المستخدم A تظهر عند B في أقل من 1 ثانية
- [ ] الـ quota يُستهلك **مرة واحدة فقط** عند أول رد في محادثة جديدة
- [ ] الحرفي يرى quota `5/5` في البداية، وينقص فقط عند رد **على زبون جديد**
- [ ] الحرفي لا يستطيع الرد إذا: `trial` وأستنفذ 5، أو `quota_used`, `cancelled`
- [ ] الاشتراك عبر Lemon Squeezy ينقل المستخدم إلى `active` خلال 5 ثوانٍ بعد الدفع
- [ ] Webhook يتحقق من التوقيع ويرفض الطلبات المزورة (اختبار بـ curl)
- [ ] إعادة إرسال نفس الـ webhook لا يُكرر الإجراء (idempotency)
- [ ] RLS تمنع حرفياً من رؤية محادثات حرفي آخر
- [ ] الزبون لا يتأثر بالـ quota أبداً (يُرسل بلا قيود)

---

### 🟡 المرحلة 5 — التقييمات والجودة (أيام 23-27)

**الهدف:** إضافة نظام التقييم، رفع جودة الكود بالاختبارات، تحسين الأداء و UX.

#### ما يجب على Claude Code أن يفعله

1. **نظام التقييم**
   - الزبون فقط يستطيع تقييم حرفي **شرط** أن يكون قد بدأ محادثة معه (انتهت أو جارية)
   - مكون `<StarRating />` (1-5 نجوم قابلة للنقر)
   - فورم: نجوم + تعليق اختياري (max 500 حرف)
   - UNIQUE constraint يمنع تقييمين من نفس الزبون لنفس الحرفي

2. **عرض التقييمات**
   - قسم في ملف الحرفي `/profile/[username]?tab=reviews`
   - Pagination بـ 10 في الصفحة
   - متوسط النجوم يظهر في Header الملف + في بطاقات Explore
   - Aggregation: استعمل view أو `avg(stars)` مع cache

3. **تعديل / حذف التقييم**
   - الزبون يستطيع تعديل تقييمه فقط، ليس حذفه (حفاظ على السمعة)

4. **Loading Skeletons**
   - لكل صفحة رئيسية: feed, explore, profile, messages
   - استعمل `<Skeleton />` من shadcn

5. **Error Boundaries**
   - `app/error.tsx` global
   - `app/(app)/error.tsx` للمسارات المحمية
   - Toast عبر `sonner` لأخطاء non-fatal

6. **Empty States**
   - فيد فارغ: "ابدأ بمتابعة حرفيين من صفحة الاكتشاف"
   - لا توجد رسائل: "لا يوجد محادثات بعد"
   - لا توجد منشورات في الملف: "لم ينشر X بعد"

7. **اختبارات الوحدة (Vitest)**
   - `tests/unit/quota.test.ts`: اختبار دالة `can_artisan_reply` بسيناريوهات مختلفة (trial مع 0, 3, 5 مستهلك / active / cancelled)
   - `tests/unit/subscription.test.ts`: اختبار معالج webhook مع payloads مزيفة
   - `tests/unit/validations.test.ts`: اختبار Zod schemas

8. **تحسينات الأداء**
   - `next/image` لكل الصور مع `sizes` مناسب
   - Cloudinary: `f_auto,q_auto,w_auto,dpr_auto`
   - Dynamic imports للمكونات الثقيلة (upload widget)
   - Prefetch للروابط المهمة

9. **Accessibility**
   - كل `<img>` لها alt
   - focus visible على الأزرار
   - aria-labels للأيقونات

#### معايير الاكتمال (DoD)

- [ ] الزبون يُقيّم الحرفي **مرة واحدة فقط** (مُفعّل في DB و UI)
- [ ] متوسط النجوم يُحدّث بعد كل تقييم جديد
- [ ] Lighthouse score ≥ 75 على Mobile في `/feed`
- [ ] جميع اختبارات Vitest تمر (`npm run test`)
- [ ] الفيد الفارغ يعرض رسالة توجيهية
- [ ] خطأ الشبكة يُظهر Toast بدل صفحة بيضاء
- [ ] لا يوجد تحذير واحد في console على الصفحات الرئيسية

---

### 🔴 المرحلة 6 — الإطلاق والمراقبة (أيام 28-31)

**الهدف:** Production، نطاق مخصص، مراقبة، إطلاق Beta.

#### ما يجب على Claude Code أن يفعله

1. **فصل البيئات**
   - مشروع Supabase منفصل للـ Production
   - مشروع Vercel منفصل (أو environment variables محكمة)
   - التأكد أن DB الإنتاج فارغة من بيانات Dev

2. **النطاق المخصص**
   - شراء نطاق (مثلاً `Chof Khdemti.ma`)
   - ربطه بـ Vercel
   - التأكد من HTTPS التلقائي
   - تحديث `NEXT_PUBLIC_APP_URL` و Lemon Squeezy redirect URLs

3. **المراقبة**
   - Vercel Analytics (مفعّل تلقائياً إذا Pro)
   - Sentry: `@sentry/nextjs` مع `sentry.client.config.ts` + `sentry.server.config.ts`
   - Supabase Log Dashboard: مراجعة الاستعلامات البطيئة

4. **المراجعة الأمنية**
   - **CHECKLIST:**
     - [ ] كل جدول عليه RLS
     - [ ] لا يوجد `SUPABASE_SERVICE_ROLE_KEY` في client code
     - [ ] كل Server Action تتحقق من `auth.getUser()`
     - [ ] Webhook Lemon Squeezy يتحقق من signature
     - [ ] لا يوجد endpoint بدون rate limiting (استعمل Vercel config أو Upstash Ratelimit)
     - [ ] CORS محدود
     - [ ] CSP headers في `next.config.ts`

5. **SEO أساسي**
   - `<title>` و `<description>` لكل صفحة
   - `robots.txt` و `sitemap.xml` (ديناميكي)
   - OG Image ديناميكية لملفات الحرفيين عبر `/api/og/[username]`
   - JSON-LD Schema.org `LocalBusiness` للحرفيين

6. **إطلاق Beta**
   - قائمة 10-20 حرفياً مع اشتراك مجاني (عبر coupon Lemon Squeezy)
   - قناة واتساب/سلاك لملاحظاتهم
   - نموذج feedback داخل التطبيق
   - متابعة Analytics يومياً

#### معايير الاكتمال (DoD)

- [ ] الموقع يفتح بـ HTTPS بدون تحذيرات
- [ ] مستخدم حقيقي يسجل وينشر أول صورة بنجاح
- [ ] دفع حقيقي عبر Lemon Squeezy ينجح في الإنتاج
- [ ] لا توجد بيانات من Dev في Production
- [ ] Sentry يستقبل أخطاء الإنتاج
- [ ] 5 حرفيين على الأقل بحسابات نشطة ومنشورات
- [ ] Lighthouse ≥ 80 على جميع الصفحات الرئيسية

---

## 10. تعليمات Claude Code أثناء العمل

هذه التعليمات يجب على Claude Code (أنا) الالتزام بها في كل جلسة:

### 10.1 قبل أي مهمة
1. اقرأ `CLAUDE.md` بالكامل (هذا الملف) إذا لم تفعل في الجلسة الحالية
2. افحص `git status` لمعرفة التعديلات الحالية
3. افحص `package.json` لمعرفة المكتبات المُثبتة
4. افحص المرحلة الحالية من خلال ملف `PROGRESS.md` (أنشئه إذا لم يكن موجوداً)

### 10.2 أثناء العمل
1. **لا تُضف مكتبة** إلا بعد التحقق من عدم وجود بديل في المكدس المُعتمد
2. **لا تُعدّل schema** بدون إنشاء migration جديد في `supabase/migrations/`
3. **لا تخترع API route جديد** إذا كان Server Action كافياً
4. **اكتب types أولاً** قبل الـ implementation
5. **اختبر محلياً** (`npm run dev`) قبل إعلان انتهاء المهمة

### 10.3 عند الشك
- إذا واجهت قراراً معمارياً غير محسوم في `CLAUDE.md` → **اسأل المستخدم** بدلاً من الافتراض
- إذا رأيت تعارضاً بين طلب حالي و `CLAUDE.md` → نبّه المستخدم وانتظر الحسم
- إذا تغير نموذج الربح أو التقنية → حدّث `CLAUDE.md` أولاً قبل الكود

### 10.4 بعد كل مهمة
1. شغّل `npm run build` للتأكد من عدم كسر الإنتاج
2. شغّل `npm run test` إذا كانت هناك اختبارات
3. شغّل `npm run lint` و أصلح الـ warnings
4. حدّث `PROGRESS.md` بما أُنجز

### 10.5 الـ Commits
- كل مهمة = commit واحد على الأقل
- رسالة الـ commit تتبع Conventional Commits (القسم 13)
- لا تعمل push لـ `main` مباشرة. افتح PR (حتى للمطور المنفرد، لأجل CI)

---

## 11. الأمان و Row Level Security

### 11.1 السياسات المطلوبة لكل جدول

**users**
- `SELECT`: الجميع (بيانات عامة: username, full_name, avatar)
- `INSERT`: المستخدم لنفسه فقط (عبر trigger من auth)
- `UPDATE`: المستخدم لنفسه فقط

**profiles**
- `SELECT`: الجميع
- `UPDATE`: `user_id = auth.uid()`

**posts**
- `SELECT`: الجميع
- `INSERT`: `author_id = auth.uid()` و المستخدم `artisan` (الزبائن لا ينشرون)
- `UPDATE/DELETE`: `author_id = auth.uid()`

**comments**
- `SELECT`: الجميع
- `INSERT`: `author_id = auth.uid()`
- `DELETE`: `author_id = auth.uid()` أو صاحب المنشور

**likes / follows**
- `SELECT`: الجميع
- `INSERT/DELETE`: `user_id = auth.uid()` / `follower_id = auth.uid()`

**conversations**
- `SELECT`: `artisan_id = auth.uid() OR customer_id = auth.uid()`
- `INSERT`: `customer_id = auth.uid()` (الزبون يبدأ دائماً)

**messages**
- `SELECT`: المستخدم طرف في المحادثة
- `INSERT`: `sender_id = auth.uid()` و طرف في المحادثة
  - **إضافة:** إذا `sender_id` = `artisan_id`، يجب استدعاء `can_artisan_reply()` (عبر check constraint أو trigger)

**ratings**
- `SELECT`: الجميع
- `INSERT`: `customer_id = auth.uid()` و توجد محادثة بينهما
- `UPDATE`: `customer_id = auth.uid()`

**subscriptions**
- `SELECT`: `user_id = auth.uid()`
- `INSERT/UPDATE`: **فقط service role** (من webhook)

**conversation_quota / webhook_events**
- لا صلاحية من client. فقط service role.

### 11.2 مثال policy

```sql
-- يمكن لأطراف المحادثة فقط قراءة رسائلها
create policy "parties_can_read_messages"
on public.messages for select
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
  )
);
```

---

## 12. الاختبارات

### 12.1 ما يجب اختباره (أولوية)

1. **منطق الـ quota** (الأهم):
   - حرفي جديد يرد مرة = quota 4/5
   - يرد مجدداً على نفس الزبون = لا يزال 4/5
   - يرد على زبون ثانٍ = 3/5
   - ... حتى يصل 0/5
   - المحاولة التالية = `can_artisan_reply()` ترجع false
   - بعد اشتراك = يسمح بلا حدود

2. **معالج webhook**:
   - توقيع خاطئ = 401
   - حدث مكرر = 200 بدون تكرار الإجراء
   - `subscription_created` = تحديث الحالة إلى `active`
   - `subscription_cancelled` = تحديث الحالة إلى `cancelled`

3. **Zod validations**:
   - محتوى المنشور يرفض النصوص > 2000 حرف
   - التقييم يرفض القيم خارج 1-5

### 12.2 مثال اختبار

```ts
// tests/unit/quota.test.ts
import { describe, it, expect } from 'vitest';
import { canArtisanReply } from '@/lib/actions/quota';

describe('canArtisanReply', () => {
  it('allows reply when trial with 0 consumed', async () => {
    const result = await canArtisanReply({ artisanId: 'a1', conversationId: 'c1', mockConsumed: 0, mockStatus: 'trial' });
    expect(result).toBe(true);
  });

  it('blocks reply when trial with 5 consumed', async () => {
    const result = await canArtisanReply({ artisanId: 'a1', conversationId: 'c1', mockConsumed: 5, mockStatus: 'trial' });
    expect(result).toBe(false);
  });

  it('allows reply on existing conversation even after quota used', async () => {
    const result = await canArtisanReply({ artisanId: 'a1', conversationId: 'c1', mockConsumed: 5, mockStatus: 'quota_used', isInQuota: true });
    expect(result).toBe(true);
  });
});
```

---

## 13. قواعد الـ Git و Commits

### 13.1 Conventional Commits

```
feat: إضافة ميزة جديدة
fix: إصلاح خطأ
refactor: إعادة هيكلة بدون تغيير سلوك
perf: تحسين أداء
test: إضافة/تعديل اختبارات
docs: توثيق
chore: صيانة (تحديث deps، إلخ)
```

أمثلة:
```
feat(subscription): integrate Lemon Squeezy checkout
fix(quota): prevent double consumption on rapid replies
refactor(messages): extract realtime logic to custom hook
```

### 13.2 Branches

- `main`: محمي، production
- `dev`: integration
- `feat/xxx`: ميزة
- `fix/xxx`: إصلاح

---

## 14. قائمة ممنوعات ومحرمات

❌ **لا تفعل هذا أبداً:**

1. لا تستعمل Stripe. نحن على Lemon Squeezy حصراً.
2. لا تُعد إنشاء جدول `wallet_accounts` أو `wallet_transactions`. النموذج تغيّر.
3. لا تخصم "درهم" على الرد. الرد إما مسموح (active/quota متبقية) أو ممنوع.
4. لا تستعمل `SUPABASE_SERVICE_ROLE_KEY` في أي ملف `use client`.
5. لا تحفظ مفاتيح API في الـ repo.
6. لا تجلب من DB بدون RLS (أي: عبر service role) إلا في webhooks و admin actions.
7. لا تستعمل `any` في TypeScript.
8. لا تستعمل `ml-*`, `mr-*`, `pl-*`, `pr-*`. استعمل منطقية `ms-*`, `me-*` لدعم RTL.
9. لا تنشر مباشرة لـ production بدون اختبار محلي.
10. لا تُضف مكتبة > 100KB بدون تبرير.
11. لا تستعمل `fetch` لـ Supabase. استعمل SDK الرسمي.
12. لا تجعل webhook Lemon Squeezy بدون تحقق من توقيع.
13. لا تدع الحرفي يرى محادثات حرفي آخر (راجع RLS دائماً).
14. لا تنشر إذا كان Lighthouse < 70 على الموبايل.
15. لا تحفظ كلمات السر. دع Supabase Auth يتولى الأمر.

✅ **افعل هذا دائماً:**

1. اقرأ `CLAUDE.md` قبل أي قرار
2. اسأل إذا شككت
3. اختبر محلياً
4. اكتب types قبل الـ implementation
5. اكتب رسائل commit واضحة
6. حدّث `PROGRESS.md` بعد كل مهمة

---

## 📎 ملاحق مهمة

### A. أوامر Claude Code الأكثر استعمالاً

```bash
# بدء التطوير
npm run dev

# تشغيل الاختبارات
npm run test

# بناء للإنتاج محلياً
npm run build && npm run start

# تحديث types من Supabase
npx supabase gen types typescript --project-id YOUR_ID > src/types/database.types.ts

# تطبيق migration محلياً
npx supabase db reset

# إضافة مكون shadcn
npx shadcn@latest add <component-name>

# نشر
git push origin main   # Vercel ينشر تلقائياً
```

### B. روابط مرجعية

- Next.js 15: https://nextjs.org/docs
- Supabase + Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- Lemon Squeezy API: https://docs.lemonsqueezy.com/api
- Lemon Squeezy Webhooks: https://docs.lemonsqueezy.com/guides/developer-guide/webhooks
- shadcn/ui: https://ui.shadcn.com
- TanStack Query: https://tanstack.com/query/latest

### C. أسعار المكدس (للرجوع)

| الخدمة | المستوى المجاني | تكلفة Pro |
|--------|-----------------|-----------|
| Supabase | 500MB DB, 1GB Storage | $25/mo |
| Vercel | 100GB bandwidth | $20/mo |
| Cloudinary | 25GB | $99/mo |
| Lemon Squeezy | - | 5% + 50¢ per transaction |
| Sentry | 5K errors/mo | $26/mo |

---

**آخر تحديث:** أبريل 2026
**الإصدار:** 1.0 (بعد تعديل نموذج الربح إلى اشتراك Lemon Squeezy)
**المشرف:** Solo Developer + Claude Code

> 💡 **ملاحظة ختامية:** هذا الملف وثيقة حيّة. إذا تغيّر أي قرار تقني أو تجاري، حدّث هذا الملف أولاً قبل الكود. الكود يتبع `CLAUDE.md`، والعكس غير صحيح.
