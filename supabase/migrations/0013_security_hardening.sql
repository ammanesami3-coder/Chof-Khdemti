-- =============================================================
-- 0013_security_hardening.sql
-- تشديد الأمان: إصلاح mark_messages_read + دالة count للـ badge
-- قابل للتشغيل عدة مرات (CREATE OR REPLACE)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. إصلاح mark_messages_read — إضافة تحقق من هوية المُستدعي
--
--    الثغرة السابقة: أي مستخدم يعرف UUID محادثة يستطيع استدعاء
--    الدالة بـ p_reader_id عشوائي وتحديث is_read لرسائل لا تخصه.
--    الإصلاح: نتحقق أن auth.uid() = p_reader_id وأن المستخدم
--    طرف فعلي في المحادثة.
-- ---------------------------------------------------------------
create or replace function public.mark_messages_read(
  p_conversation_id uuid,
  p_reader_id       uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- تأكد أن المُستدعي هو نفسه الـ reader
  if auth.uid() is distinct from p_reader_id then
    raise exception 'Unauthorized: caller is not the reader';
  end if;

  -- تأكد أن المستخدم طرف في المحادثة
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
  ) then
    raise exception 'Unauthorized: user is not a party to this conversation';
  end if;

  update public.messages
  set is_read = true
  where conversation_id = p_conversation_id
    and sender_id      <> p_reader_id
    and is_read         = false;
end;
$$;

-- ---------------------------------------------------------------
-- 2. دالة get_total_unread_count() — للـ navbar badge
--
--    أكفأ من استدعاء get_user_conversations() كاملاً.
--    تُرجع عدد الرسائل غير المقروءة للمستخدم الحالي
--    (الرسائل المُرسَلة من الشريك، ليس من نفسه).
--    ملاحظة: يتطلب Realtime مفعّلاً على جدول conversations
--    في Supabase Dashboard حتى يعمل badge التحديث الفوري.
-- ---------------------------------------------------------------
create or replace function public.get_total_unread_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(count(*), 0)
  from public.messages  m
  join public.conversations c on c.id = m.conversation_id
  where (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    and m.sender_id != auth.uid()
    and m.is_read    = false;
$$;
