-- ─────────────────────────────────────────────────────────────────────────────
-- Suggested artisans with a time-based rotation window.
--
-- Goal: surface only *currently-subscribed* artisans (active paid OR live trial),
-- showing p_limit (default 5) at a time, and rotating to a *fresh* window every
-- 30 minutes so that — over time — every subscribed artisan gets exposure.
--
-- How the rotation works:
--   • The full subscribed pool is ordered deterministically (by user id).
--   • A 30-minute "slot" index is derived from the wall clock:
--         slot = floor(epoch_seconds / 1800)
--   • Each slot advances the window start by p_limit, wrapping around the pool:
--         offset = (slot * p_limit) % total
--   • Within a single 30-min slot the offset is constant → the same 5 are shown.
--     When the slot flips, the next 5 (that weren't shown) appear; once the pool
--     is exhausted it cycles back to the beginning.
--
-- security definer + stable: callers (server components / client RPC) bypass RLS
-- on `subscriptions` to evaluate subscription status, but read-only.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_suggested_artisans(
  p_exclude uuid default null,
  p_limit   int  default 5
)
returns table (
  id             uuid,
  username       text,
  full_name      text,
  avatar_url     text,
  craft_category text,
  city           text
)
language plpgsql
security definer
stable
as $$
declare
  v_total  int;
  v_slot   bigint;
  v_offset int;
begin
  if p_limit is null or p_limit < 1 then
    p_limit := 5;
  end if;

  -- Size of the currently-subscribed artisan pool.
  select count(*)
  into   v_total
  from   public.subscriptions s
  join   public.users u on u.id = s.user_id
  where  u.account_type = 'artisan'
    and  (p_exclude is null or u.id <> p_exclude)
    and  (
           s.status = 'active'
           or (s.status = 'trial' and s.trial_ends_at > now())
         );

  if v_total = 0 then
    return;
  end if;

  -- 30-minute slot (1800s), epoch-aligned so it flips on the half hour.
  v_slot   := floor(extract(epoch from now()) / 1800)::bigint;
  v_offset := ((v_slot * p_limit) % v_total)::int;

  return query
  with pool as (
    select u.id,
           u.username,
           u.full_name,
           p.avatar_url,
           p.craft_category,
           p.city,
           (row_number() over (order by u.id) - 1) as rn
    from   public.subscriptions s
    join   public.users u on u.id = s.user_id
    left join public.profiles p on p.user_id = u.id
    where  u.account_type = 'artisan'
      and  (p_exclude is null or u.id <> p_exclude)
      and  (
             s.status = 'active'
             or (s.status = 'trial' and s.trial_ends_at > now())
           )
  )
  select pool.id, pool.username, pool.full_name,
         pool.avatar_url, pool.craft_category, pool.city
  from   pool
  -- Wrap-around window: order so position v_offset comes first, then take p_limit.
  order  by ((pool.rn - v_offset + v_total) % v_total)
  limit  p_limit;
end;
$$;

grant execute on function public.get_suggested_artisans(uuid, int) to anon, authenticated;
