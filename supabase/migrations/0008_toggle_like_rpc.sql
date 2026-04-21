-- =============================================================
-- 0008_toggle_like_rpc.sql
-- دالة toggle_like — تبديل الإعجاب بشكل atomic
-- الـ triggers في 0003 تتولى تحديث likes_count تلقائياً
-- =============================================================

create or replace function public.toggle_like(p_post_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_user_id  uuid := auth.uid();
  v_liked    boolean;
  v_count    int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from public.likes
    where user_id = v_user_id and post_id = p_post_id
  ) then
    delete from public.likes
    where user_id = v_user_id and post_id = p_post_id;
    v_liked := false;
  else
    insert into public.likes (user_id, post_id)
    values (v_user_id, p_post_id);
    v_liked := true;
  end if;

  -- The triggers in 0003 have already updated likes_count in the same transaction
  select likes_count into v_count from public.posts where id = p_post_id;

  return jsonb_build_object('liked', v_liked, 'new_count', v_count);
end;
$$;
