-- =============================================================
-- 0043_search_artisans_rpc.sql
-- Single-query artisan search replacing 3 separate round-trips.
--
-- Why PostgREST embedded filters don't work for this:
--   .eq('profiles.craft_category', craft)   filters the *embedded
--   object* but does NOT exclude parent rows. An artisan with no
--   matching profile still appears with profiles: null.
--
-- This function uses an INNER JOIN so craft / city filters correctly
-- exclude non-matching rows at the DB level.
-- =============================================================

create or replace function public.search_artisans(
  p_craft   text    default '',
  p_city    text    default '',
  p_q       text    default '',
  p_sort    text    default 'default',
  p_limit   int     default 20,
  p_offset  int     default 0
)
returns table (
  id               uuid,
  username         text,
  full_name        text,
  created_at       timestamptz,
  avatar_url       text,
  is_verified      boolean,
  craft_category   text,
  city             text,
  years_experience int,
  avg_rating       numeric,
  ratings_count    int,
  is_subscribed    boolean
)
language sql
security definer
stable
as $$
  with
  -- aggregate ratings once (faster than per-row subquery)
  craft_ratings as (
    select
      artisan_id,
      round(avg(stars)::numeric, 1) as avg_rating,
      count(*)::int                  as ratings_count
    from public.ratings
    group by artisan_id
  ),
  -- subscription active = paid OR inside free trial window
  sub_status as (
    select
      user_id,
      (   status = 'active'
       or (status = 'trial' and trial_ends_at > now())
      )::boolean as is_subscribed
    from public.subscriptions
  )
  select
    u.id,
    u.username,
    u.full_name,
    u.created_at,
    pr.avatar_url,
    coalesce(pr.is_verified, false),
    pr.craft_category,
    pr.city,
    pr.years_experience,
    cr.avg_rating,                          -- null when no ratings yet
    coalesce(cr.ratings_count, 0)::int,
    coalesce(ss.is_subscribed, false)
  from public.users u
  inner join public.profiles pr on pr.user_id = u.id
  left  join craft_ratings    cr on cr.artisan_id = u.id
  left  join sub_status       ss on ss.user_id    = u.id
  where u.account_type = 'artisan'
    -- respect privacy setting (default = 'everyone' for all existing rows)
    and pr.profile_visibility = 'everyone'
    -- craft filter — INNER JOIN means a null profile never appears here
    and (p_craft = '' or pr.craft_category = p_craft)
    -- city filter
    and (p_city  = '' or pr.city           = p_city)
    -- text search on name / username
    and (p_q = ''
         or u.full_name ilike '%' || p_q || '%'
         or u.username  ilike '%' || p_q || '%')
  order by
    -- default & rating: subscribed first (0 = subscribed → ASC puts them first)
    case when p_sort in ('default', 'rating')
      then (case when coalesce(ss.is_subscribed, false) then 0 else 1 end)::int
    end asc  nulls last,
    -- then by average rating
    case when p_sort in ('default', 'rating')
      then coalesce(cr.avg_rating, 0::numeric)
    end desc nulls last,
    -- then by number of ratings (more reviews = more trustworthy)
    case when p_sort in ('default', 'rating')
      then coalesce(cr.ratings_count, 0)::int
    end desc nulls last,
    -- experience sort
    case when p_sort = 'experience'
      then coalesce(pr.years_experience, 0)
    end desc nulls last,
    -- newest is the final / standalone tiebreaker
    u.created_at desc
  limit  p_limit
  offset p_offset;
$$;

-- Allow both guests and logged-in users to call this (explore is public)
grant execute on function public.search_artisans(text, text, text, text, int, int)
  to anon, authenticated;
