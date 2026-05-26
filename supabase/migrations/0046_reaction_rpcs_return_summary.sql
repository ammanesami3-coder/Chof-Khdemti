-- =============================================================
-- 0046_reaction_rpcs_return_summary.sql
-- جعل الـ RPCs ترجع `new_summary` (الملخص الموثوق من DB)
-- يلغي الحاجة لـ refetch بعد التفاعل ويزيل الـ flicker
--
-- التغييرات:
--   1. التأكد من وجود reactions_summary على comments (idempotent مع 0045)
--   2. تحديث trigger refresh_comment_reactions_summary
--   3. toggle_reaction يرجع new_summary
--   4. toggle_comment_reaction يرجع new_summary
-- =============================================================

-- ── 1. comments.reactions_summary — idempotent ────────────────────────────────

alter table public.comments
  add column if not exists reactions_summary jsonb not null default '{}';

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

-- Backfill (idempotent, safe to re-run)
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
where reactions_summary is null or reactions_summary = '{}'::jsonb;

-- ── 2. toggle_reaction (posts) — returns new_summary ─────────────────────────

create or replace function public.toggle_reaction(
  p_post_id  uuid,
  p_reaction text default 'like'
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing text;
  v_reacted boolean;
  v_count int;
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select reaction_type into v_existing
  from public.likes
  where user_id = v_user_id and post_id = p_post_id;

  if v_existing is null then
    insert into public.likes (user_id, post_id, reaction_type)
    values (v_user_id, p_post_id, p_reaction);
    v_reacted := true;
  elsif v_existing = p_reaction then
    delete from public.likes
    where user_id = v_user_id and post_id = p_post_id;
    v_reacted := false;
  else
    delete from public.likes
    where user_id = v_user_id and post_id = p_post_id;
    insert into public.likes (user_id, post_id, reaction_type)
    values (v_user_id, p_post_id, p_reaction);
    v_reacted := true;
  end if;

  -- Read authoritative state AFTER triggers have run (likes_count + reactions_summary)
  select likes_count, reactions_summary
  into v_count, v_summary
  from public.posts where id = p_post_id;

  return jsonb_build_object(
    'reacted',     v_reacted,
    'reaction',    case when v_reacted then p_reaction else null end,
    'new_count',   coalesce(v_count, 0),
    'new_summary', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.toggle_reaction(uuid, text) to anon, authenticated;

-- ── 3. toggle_comment_reaction — returns new_summary ──────────────────────────

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
  v_summary        jsonb;
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

  -- Read authoritative state AFTER triggers have run
  select likes_count, reactions_summary
  into v_count, v_summary
  from public.comments where id = p_comment_id;

  return jsonb_build_object(
    'reacted',     v_reacted,
    'reaction',    case when v_reacted then p_reaction else null end,
    'new_count',   coalesce(v_count, 0),
    'new_summary', coalesce(v_summary, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.toggle_comment_reaction(uuid, text) to anon, authenticated;
