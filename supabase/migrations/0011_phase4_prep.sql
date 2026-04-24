-- =============================================================
-- 0011_phase4_prep.sql
-- إصلاحان ضروريان قبل بناء المرحلة 4 (المحادثات + الاشتراك)
-- قابل للتشغيل مرة واحدة (idempotent)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. حذف النسخة القديمة can_artisan_reply(uuid, uuid)
--
--    الخلفية: 0004 أنشأت can_artisan_reply بمعاملَين (artisan_id, conversation_id)
--    وكانت تعتمد على جدول conversation_quota الذي حُذف في 0010.
--    0010 أنشأت نسخة جديدة بمعامل واحد (artisan_id)، لكن CREATE OR REPLACE
--    في PostgreSQL يتطابق على الـ signature كاملاً — فأنشأ دالة ثانية
--    بدل استبدال القديمة. النسخة القديمة مكسورة (تشير لجدول محذوف).
-- ---------------------------------------------------------------
drop function if exists public.can_artisan_reply(uuid, uuid);

-- ---------------------------------------------------------------
-- 2. إعادة تعريف update_conversation_last_message مع SECURITY DEFINER
--
--    الخلفية: الدالة في 0003 تُنفَّذ داخل trigger بعد INSERT على messages.
--    تحاول UPDATE conversations.last_message_at، لكن بدون SECURITY DEFINER
--    تعمل بصلاحيات المستخدم المُرسِل. جدول conversations لا يملك UPDATE
--    policy في RLS، فيفشل الـ UPDATE صامتاً (0 rows) → last_message_at
--    لا يُحدَّث أبداً → قائمة المحادثات مرتّبة خطأً.
-- ---------------------------------------------------------------
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

-- ملاحظة: الـ trigger trg_update_last_message_at موجود من 0003 ويستدعي
-- هذه الدالة بالاسم — يستفيد تلقائياً من التعريف الجديد بدون إعادة إنشائه.

-- ---------------------------------------------------------------
-- تذكير: خطوات يدوية خارج نطاق هذه الـ migration
-- (تُنفَّذ من Supabase Dashboard → Database → Extensions ثم SQL Editor)
--
-- 1. تفعيل امتداد pg_cron:
--    الذهاب إلى: Database → Extensions → البحث عن "pg_cron" → Enable
--
-- 2. جدولة expire_trials يومياً:
--    select cron.schedule(
--      'expire-trials-daily',
--      '0 0 * * *',
--      'select public.expire_trials()'
--    );
--
-- 3. للتحقق أن الجدولة نجحت:
--    select * from cron.job where jobname = 'expire-trials-daily';
-- ---------------------------------------------------------------
