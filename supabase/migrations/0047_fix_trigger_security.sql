-- =============================================================
-- 0047_fix_trigger_security.sql
-- إصلاح صلاحيات دوال الـ triggers لتحديث العدّادات
--
-- المشكلة: دوال increment/decrement/refresh لا تملك
--   SECURITY DEFINER، فتعمل بصلاحيات المستخدم المُتفاعل
--   (authenticated role). سياسة RLS تمنع UPDATE على posts/comments
--   لغير أصحابها، فتُهمَل تحديثات likes_count/reactions_summary.
--
-- الحل: إضافة SECURITY DEFINER لكل هذه الدوال حتى تعمل
--   بصلاحيات postgres (BYPASSRLS) وتُحدَّث العدّادات صحيحاً.
--
-- + إعادة حساب (backfill) كل العدّادات من بيانات الجداول الفعلية.
-- =============================================================

-- ── 1. increment_post_likes ──────────────────────────────────────────────────

create or replace function public.increment_post_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$;

-- ── 2. decrement_post_likes ──────────────────────────────────────────────────

create or replace function public.decrement_post_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

-- ── 3. increment_post_comments ───────────────────────────────────────────────

create or replace function public.increment_post_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$;

-- ── 4. decrement_post_comments ───────────────────────────────────────────────

create or replace function public.decrement_post_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

-- ── 5. refresh_post_reactions_summary ────────────────────────────────────────

create or replace function public.refresh_post_reactions_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
begin
  update public.posts
  set reactions_summary = coalesce(
    (
      select jsonb_object_agg(reaction_type, cnt)
      from (
        select reaction_type, count(*)::int as cnt
        from public.likes
        where post_id = v_post_id
        group by reaction_type
      ) t
    ),
    '{}'::jsonb
  )
  where id = v_post_id;
  return coalesce(new, old);
end;
$$;

-- ── 6. inc_comment_likes ─────────────────────────────────────────────────────

create or replace function public.inc_comment_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.comments
  set likes_count = likes_count + 1
  where id = new.comment_id;
  return new;
end;
$$;

-- ── 7. dec_comment_likes ─────────────────────────────────────────────────────

create or replace function public.dec_comment_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.comments
  set likes_count = greatest(likes_count - 1, 0)
  where id = old.comment_id;
  return old;
end;
$$;

-- ── 8. refresh_comment_reactions_summary ─────────────────────────────────────

create or replace function public.refresh_comment_reactions_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_id uuid := coalesce(new.comment_id, old.comment_id);
begin
  update public.comments
  set reactions_summary = coalesce(
    (
      select jsonb_object_agg(reaction_type, cnt)
      from (
        select reaction_type, count(*)::int as cnt
        from public.comment_likes
        where comment_id = v_comment_id
        group by reaction_type
      ) t
    ),
    '{}'::jsonb
  )
  where id = v_comment_id;
  return coalesce(new, old);
end;
$$;

-- ── 9. Backfill — إعادة الحساب الصحيح من الجداول الفعلية ──────────────────────

-- likes_count لكل المنشورات
update public.posts
set likes_count = (
  select count(*)::int
  from public.likes l
  where l.post_id = posts.id
);

-- reactions_summary لكل المنشورات
update public.posts p
set reactions_summary = coalesce(
  (
    select jsonb_object_agg(reaction_type, cnt)
    from (
      select reaction_type, count(*)::int as cnt
      from public.likes
      where post_id = p.id
      group by reaction_type
    ) t
  ),
  '{}'::jsonb
);

-- comments_count لكل المنشورات
update public.posts
set comments_count = (
  select count(*)::int
  from public.comments c
  where c.post_id = posts.id
);

-- likes_count لكل التعليقات
update public.comments
set likes_count = (
  select count(*)::int
  from public.comment_likes cl
  where cl.comment_id = comments.id
);

-- reactions_summary لكل التعليقات
update public.comments c
set reactions_summary = coalesce(
  (
    select jsonb_object_agg(reaction_type, cnt)
    from (
      select reaction_type, count(*)::int as cnt
      from public.comment_likes
      where comment_id = c.id
      group by reaction_type
    ) t
  ),
  '{}'::jsonb
)
where exists (
  select 1 from public.comment_likes cl where cl.comment_id = c.id
);
