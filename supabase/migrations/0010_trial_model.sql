-- =============================================================
-- 0010_trial_model.sql
-- تحويل نموذج الربح من Quota (5 محادثات) إلى Trial (30 يوماً)
-- قابل للتشغيل مرة واحدة فوق بيئة منشّأة بـ 0004_subscriptions.sql
-- =============================================================

-- ---------------------------------------------------------------
-- 1. إضافة القيمة الجديدة للـ enum (لا يمكن حذف قيمة نشطة في Postgres)
--    نضيف 'trial_ended' ونحتفظ بـ 'quota_used' معطّلة الاستعمال
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.subscription_status'::regtype
    and   enumlabel = 'trial_ended'
  ) then
    alter type public.subscription_status add value 'trial_ended';
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- 2. إضافة عمود trial_ends_at إلى subscriptions (إذا لم يكن موجوداً)
-- ---------------------------------------------------------------
alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;

-- فهرس جزئي لتسريع استعلام expire_trials()
create index if not exists subscriptions_trial_ends_at_idx
  on public.subscriptions(trial_ends_at)
  where status = 'trial';

-- تعيين trial_ends_at للصفوف الحالية التي لم يُعيَّن لها بعد
-- (30 يوماً من تاريخ الإنشاء كتقريب لبيئة الـ dev)
update public.subscriptions
set trial_ends_at = created_at + interval '30 days'
where status = 'trial'
  and trial_ends_at is null;

-- ---------------------------------------------------------------
-- 3. حذف trigger trg_consume_quota والدالة المرتبطة به
-- ---------------------------------------------------------------
drop trigger if exists trg_consume_quota on public.messages;

drop function if exists public.consume_quota_on_reply();

-- ---------------------------------------------------------------
-- 4. حذف الدالة القديمة get_artisan_quota_status()
-- ---------------------------------------------------------------
drop function if exists public.get_artisan_quota_status(uuid);

-- ---------------------------------------------------------------
-- 5. إسقاط جدول conversation_quota (إذا كان موجوداً)
-- ---------------------------------------------------------------
drop table if exists public.conversation_quota cascade;

-- ---------------------------------------------------------------
-- 6. حذف حقل first_artisan_reply_at من conversations (إذا موجود)
-- ---------------------------------------------------------------
alter table public.conversations
  drop column if exists first_artisan_reply_at;

-- ---------------------------------------------------------------
-- 7. إعادة كتابة can_artisan_reply() — نسخة مبسّطة بدون quota
--    تفحص status و trial_ends_at فقط
-- ---------------------------------------------------------------
create or replace function public.can_artisan_reply(p_artisan_id uuid)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_status        public.subscription_status;
  v_trial_ends_at timestamptz;
begin
  select status, trial_ends_at
  into v_status, v_trial_ends_at
  from public.subscriptions
  where user_id = p_artisan_id;

  -- لا subscription موجود (غير متوقع) — نمنع احتياطاً
  if v_status is null then
    return false;
  end if;

  -- اشتراك نشط → محادثات غير محدودة
  if v_status = 'active' then
    return true;
  end if;

  -- ضمن فترة التجربة ولم تنتهِ بعد
  if v_status = 'trial' and v_trial_ends_at is not null and v_trial_ends_at > now() then
    return true;
  end if;

  -- trial_ended / past_due / cancelled / trial منتهٍ بدون subscription
  return false;
end;
$$;

-- ---------------------------------------------------------------
-- 8. دالة expire_trials() — تُشغَّل يومياً عبر pg_cron
-- ---------------------------------------------------------------
create or replace function public.expire_trials()
returns void
language plpgsql
security definer
as $$
begin
  update public.subscriptions
  set status     = 'trial_ended',
      updated_at = now()
  where status        = 'trial'
    and trial_ends_at is not null
    and trial_ends_at <= now();
end;
$$;

-- لتفعيل الجدولة اليومية في Supabase (يتطلب امتداد pg_cron مفعّلاً):
-- select cron.schedule('expire-trials-daily', '0 0 * * *', 'select public.expire_trials()');

-- ---------------------------------------------------------------
-- 9. تحديث create_artisan_subscription() لتضع trial_ends_at تلقائياً
-- ---------------------------------------------------------------
create or replace function public.create_artisan_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.account_type = 'artisan' then
    insert into public.subscriptions (user_id, status, trial_ends_at)
    values (new.id, 'trial', now() + interval '30 days')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
