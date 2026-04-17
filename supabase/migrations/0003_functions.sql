-- =============================================================
-- 0003_functions.sql
-- دوال وـ triggers للعدادات (likes_count, comments_count)
-- و تحديث last_message_at على المحادثة
-- قابل للتشغيل عدة مرات (CREATE OR REPLACE)
-- =============================================================

-- ---------------------------------------------------------------
-- likes_count — increment / decrement
-- ---------------------------------------------------------------
create or replace function public.increment_post_likes()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_likes()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_inc_likes') then
    create trigger trg_inc_likes
      after insert on public.likes
      for each row execute function public.increment_post_likes();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_dec_likes') then
    create trigger trg_dec_likes
      after delete on public.likes
      for each row execute function public.decrement_post_likes();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- comments_count — increment / decrement
-- ---------------------------------------------------------------
create or replace function public.increment_post_comments()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$;

create or replace function public.decrement_post_comments()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_inc_comments') then
    create trigger trg_inc_comments
      after insert on public.comments
      for each row execute function public.increment_post_comments();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_dec_comments') then
    create trigger trg_dec_comments
      after delete on public.comments
      for each row execute function public.decrement_post_comments();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- last_message_at — يُحدَّث عند كل رسالة جديدة
-- ---------------------------------------------------------------
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_update_last_message_at'
  ) then
    create trigger trg_update_last_message_at
      after insert on public.messages
      for each row execute function public.update_conversation_last_message();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- is_read — تحديث تلقائي لـ is_read عند قراءة الرسائل
-- (دالة مساعدة تُستدعى من Server Action)
-- ---------------------------------------------------------------
create or replace function public.mark_messages_read(
  p_conversation_id uuid,
  p_reader_id       uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.messages
  set is_read = true
  where conversation_id = p_conversation_id
    and sender_id      <> p_reader_id
    and is_read         = false;
end;
$$;
