-- =============================================================
-- 0044_reactions.sql
-- نظام التفاعلات المتعددة (Like / Love / Haha / Wow / Sad / Angry)
--
-- التغييرات:
--   1. إضافة reaction_type لجدول likes (default 'like' — backward compat)
--   2. إضافة reaction_type لجدول comment_likes
--   3. إضافة reactions_summary jsonb لجدول posts (يُحدَّث بـ trigger)
--   4. RPC toggle_reaction     — atomic insert / change / remove للمنشورات
--   5. RPC toggle_comment_reaction — نفسه للتعليقات
-- =============================================================

-- ── 1. likes.reaction_type ───────────────────────────────────────────────────

alter table public.likes
  add column if not exists reaction_type text not null default 'like'
    check (reaction_type in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));

-- ── 2. comment_likes.reaction_type ──────────────────────────────────────────

alter table public.comment_likes
  add column if not exists reaction_type text not null default 'like'
    check (reaction_type in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));

-- ── 3. posts.reactions_summary ───────────────────────────────────────────────

alter table public.posts
  add column if not exists reactions_summary jsonb not null default '{}';

-- Trigger function: إعادة حساب الملخص عند كل تغيير
create or replace function public.refresh_post_reactions_summary()
returns trigger language plpgsql as $$
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

drop trigger if exists trg_refresh_post_reactions_summary on public.likes;
create trigger trg_refresh_post_reactions_summary
  after insert or delete or update of reaction_type on public.likes
  for each row execute function public.refresh_post_reactions_summary();

-- ── 4. RPC toggle_reaction ────────────────────────────────────────────────────
-- منطق atomic: إضافة / تغيير / حذف التفاعل.
-- التغيير (change) يستخدم DELETE + INSERT لتشغيل الـ triggers الحالية
-- وتجنب الحاجة لـ UPDATE policy جديدة.

create or replace function public.toggle_reaction(
  p_post_id  uuid,
  p_reaction text default 'like'
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid  := auth.uid();
  v_existing text;
  v_reacted  boolean;
  v_count    int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select reaction_type into v_existing
  from public.likes
  where user_id = v_user_id and post_id = p_post_id;

  if v_existing is null then
    -- لا يوجد تفاعل → إضافة
    insert into public.likes (user_id, post_id, reaction_type)
    values (v_user_id, p_post_id, p_reaction);
    v_reacted := true;

  elsif v_existing = p_reaction then
    -- نفس التفاعل → إزالة (toggle off)
    delete from public.likes
    where user_id = v_user_id and post_id = p_post_id;
    v_reacted := false;

  else
    -- تفاعل مختلف → تغيير النوع (DELETE + INSERT)
    -- الـ triggers يُعوّضان بعضهما: count لا يتغير
    delete from public.likes
    where user_id = v_user_id and post_id = p_post_id;
    insert into public.likes (user_id, post_id, reaction_type)
    values (v_user_id, p_post_id, p_reaction);
    v_reacted := true;
  end if;

  select likes_count into v_count from public.posts where id = p_post_id;

  return jsonb_build_object(
    'reacted',   v_reacted,
    'reaction',  case when v_reacted then p_reaction else null end,
    'new_count', v_count
  );
end;
$$;

grant execute on function public.toggle_reaction(uuid, text) to anon, authenticated;

-- ── 5. RPC toggle_comment_reaction ───────────────────────────────────────────

create or replace function public.toggle_comment_reaction(
  p_comment_id uuid,
  p_reaction   text default 'like'
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id        uuid := auth.uid();
  v_existing_id    uuid;
  v_existing_type  text;
  v_reacted        boolean;
  v_count          int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select id, reaction_type
  into v_existing_id, v_existing_type
  from public.comment_likes
  where user_id = v_user_id and comment_id = p_comment_id;

  if v_existing_id is null then
    insert into public.comment_likes (user_id, comment_id, reaction_type)
    values (v_user_id, p_comment_id, p_reaction);
    v_reacted := true;

  elsif v_existing_type = p_reaction then
    delete from public.comment_likes where id = v_existing_id;
    v_reacted := false;

  else
    delete from public.comment_likes where id = v_existing_id;
    insert into public.comment_likes (user_id, comment_id, reaction_type)
    values (v_user_id, p_comment_id, p_reaction);
    v_reacted := true;
  end if;

  select likes_count into v_count from public.comments where id = p_comment_id;

  return jsonb_build_object(
    'reacted',   v_reacted,
    'reaction',  case when v_reacted then p_reaction else null end,
    'new_count', v_count
  );
end;
$$;

grant execute on function public.toggle_comment_reaction(uuid, text) to anon, authenticated;

-- ── 6. حساب reactions_summary الأولي للمنشورات الموجودة ────────────────────

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
