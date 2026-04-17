<<<<<<< HEAD
# شوف خدمتي — Chof Khdemti

منصة اجتماعية للحرفيين وأصحاب الخدمات في المغرب والعالم العربي.  
تمكّن الحرفيين من نشر أعمالهم، بناء سمعتهم الرقمية، واستقبال طلبات الزبائن عبر محادثة فورية.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database & Auth:** Supabase (PostgreSQL + RLS + Realtime)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Media:** Cloudinary
- **Payments:** Lemon Squeezy (اشتراك 99 درهم/شهر للحرفيين)
- **Hosting:** Vercel

## التشغيل المحلي

### 1. استنساخ المستودع

```bash
git clone https://github.com/<your-username>/chof-khdemti.git
cd chof-khdemti
```

### 2. تثبيت الاعتماديات

```bash
npm install
```

### 3. إعداد متغيرات البيئة

```bash
cp .env.example .env.local
```

ثم عبئ القيم في `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_VARIANT_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. تطبيق migrations قاعدة البيانات

```bash
npx supabase db reset
```

### 5. تشغيل الخادم

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## أوامر مفيدة

```bash
npm run build        # بناء للإنتاج
npm run test         # تشغيل الاختبارات (Vitest)
npm run lint         # فحص الكود
npm run gen:types    # تحديث types من Supabase
```

## هيكل المشروع

```
src/
├── app/          # Pages & API routes (Next.js App Router)
├── components/   # React components
├── lib/          # Supabase, Lemon Squeezy, Cloudinary clients + Server Actions
├── hooks/        # Custom React hooks
└── types/        # TypeScript types
supabase/
└── migrations/   # SQL migrations
```

## نموذج الربح

- الزبائن: مجاناً بالكامل
- الحرفيون: 5 محادثات مجانية ← ثم اشتراك **99 درهم/شهر** عبر Lemon Squeezy
=======
# Chof-Khdemti
services marketplace
>>>>>>> 7d95f4212a150ff81d59eceed742d83a313f9a5b
