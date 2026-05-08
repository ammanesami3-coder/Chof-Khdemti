-- 0025_message_attachments.sql
-- Add attachment support to messages

alter table public.messages
  add column if not exists attachment_url      text,
  add column if not exists attachment_metadata jsonb;
