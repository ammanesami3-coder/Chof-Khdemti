-- =============================================================
-- 0018_voice_messages.sql
-- إضافة دعم الرسائل الصوتية في جدول messages
-- =============================================================

-- 1. اجعل content قابلاً للـ null (الرسائل الصوتية لا تحتاج نصاً)
alter table public.messages alter column content drop not null;

-- 2. أضف أعمدة الرسالة الصوتية
alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'voice')),
  add column if not exists voice_url      text,
  add column if not exists voice_duration int;   -- بالثوانٍ

-- 3. index للاستعلام السريع عن نوع الرسالة
create index if not exists messages_type_idx
  on public.messages(message_type)
  where message_type = 'voice';
