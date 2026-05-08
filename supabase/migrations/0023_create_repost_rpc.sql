-- ── 0023_create_repost_rpc.sql ───────────────────────────────────────────────
-- Security-definer RPC so any authenticated user (artisan OR customer)
-- can create a repost, bypassing the artisan-only INSERT policy on posts.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_repost(
  p_original_post_id uuid,
  p_comment          text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_root_post_id uuid;
  v_new_post_id  uuid;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  -- Resolve to the root post (avoid repost-of-repost chains)
  select coalesce(shared_post_id, id)
    into v_root_post_id
    from public.posts
   where id = p_original_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  -- Prevent duplicate reposts
  if exists (
    select 1 from public.posts
     where author_id      = v_uid
       and shared_post_id = v_root_post_id
  ) then
    raise exception 'Already reposted';
  end if;

  -- Insert the repost (security definer bypasses the artisan-only RLS policy)
  insert into public.posts (author_id, content, media, shared_post_id)
  values (
    v_uid,
    nullif(trim(coalesce(p_comment, '')), ''),
    '[]'::jsonb,
    v_root_post_id
  )
  returning id into v_new_post_id;

  return v_new_post_id;
end;
$$;
