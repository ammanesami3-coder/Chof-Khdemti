-- =============================================================
-- 0045_comment_reactions_summary.sql
-- إضافة ملخص التفاعلات لجدول التعليقات
--
-- التغييرات:
--   1. إضافة reactions_summary jsonb لجدول comments
--   2. Trigger لتحديثه تلقائياً عند كل تغيير في comment_likes
--   3. Backfill البيانات الموجودة
-- =============================================================

-- ── 1. comments.reactions_summary ────────────────────────────────────────────

alter table public.comments
  add column if not exists reactions_summary jsonb not null default '{}';

-- ── 2. Trigger function ───────────────────────────────────────────────────────

create or replace function public.refresh_comment_reactions_summary()
returns trigger language plpgsql as $$
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

drop trigger if exists trg_refresh_comment_reactions_summary on public.comment_likes;
create trigger trg_refresh_comment_reactions_summary
  after insert or delete or update of reaction_type on public.comment_likes
  for each row execute function public.refresh_comment_reactions_summary();

-- ── 3. Backfill القيم الموجودة ───────────────────────────────────────────────

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
);
