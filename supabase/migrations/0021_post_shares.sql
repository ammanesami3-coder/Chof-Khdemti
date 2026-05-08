-- ── 0021_post_shares.sql ─────────────────────────────────────────────────────
-- Comprehensive post sharing: reposts, story shares, message shares
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add shared_post_id to posts (reposts / share to profile)
alter table public.posts
  add column if not exists shared_post_id uuid references public.posts(id) on delete set null;

-- 2. Add shares_count to posts
alter table public.posts
  add column if not exists shares_count int not null default 0;

-- 3. Add shared_post_id to status_updates (story shares)
alter table public.status_updates
  add column if not exists shared_post_id uuid references public.posts(id) on delete set null;

-- 4. Add shared_post_id to messages (DM shares)
alter table public.messages
  add column if not exists shared_post_id uuid references public.posts(id) on delete set null;

-- 5. Extend message_type to allow 'post_share'
alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'voice', 'post_share'));

-- 6. Indexes
create index if not exists posts_shared_post_id_idx
  on public.posts(shared_post_id) where shared_post_id is not null;

create index if not exists messages_shared_post_id_idx
  on public.messages(shared_post_id) where shared_post_id is not null;

create index if not exists status_shared_post_id_idx
  on public.status_updates(shared_post_id) where shared_post_id is not null;

-- 7. Function: increment shares_count on any share action
create or replace function public.inc_post_shares_count()
returns trigger language plpgsql security definer as $$
begin
  if new.shared_post_id is not null then
    update public.posts
       set shares_count = shares_count + 1
     where id = new.shared_post_id;
  end if;
  return new;
end;
$$;

-- Trigger: repost
drop trigger if exists trg_inc_shares_repost on public.posts;
create trigger trg_inc_shares_repost
  after insert on public.posts
  for each row
  when (new.shared_post_id is not null)
  execute function public.inc_post_shares_count();

-- Trigger: message share
drop trigger if exists trg_inc_shares_message on public.messages;
create trigger trg_inc_shares_message
  after insert on public.messages
  for each row
  when (new.shared_post_id is not null)
  execute function public.inc_post_shares_count();

-- Trigger: story share
drop trigger if exists trg_inc_shares_status on public.status_updates;
create trigger trg_inc_shares_status
  after insert on public.status_updates
  for each row
  when (new.shared_post_id is not null)
  execute function public.inc_post_shares_count();

-- 8. get_shareable_users(): followers/following + existing conversations
create or replace function public.get_shareable_users()
returns table(
  user_id      uuid,
  username     text,
  full_name    text,
  avatar_url   text,
  conversation_id uuid,
  has_conversation boolean
) language sql security definer stable as $$
  with my_convs as (
    select
      case when c.artisan_id = auth.uid() then c.customer_id
           else c.artisan_id end as other_user_id,
      c.id as conv_id
    from public.conversations c
    where c.artisan_id = auth.uid()
       or c.customer_id = auth.uid()
  )
  select distinct on (u.id)
    u.id                        as user_id,
    u.username,
    u.full_name,
    p.avatar_url,
    mc.conv_id                  as conversation_id,
    (mc.conv_id is not null)    as has_conversation
  from public.users u
  join public.profiles p on p.user_id = u.id
  left join my_convs mc on mc.other_user_id = u.id
  where u.id != auth.uid()
    and (
      mc.conv_id is not null
      or exists (
        select 1 from public.follows f
        where (f.follower_id = auth.uid() and f.following_id = u.id)
           or (f.follower_id = u.id       and f.following_id = auth.uid())
      )
    )
  order by u.id, (mc.conv_id is not null) desc
  limit 50;
$$;

-- 9. get_or_create_conversation_for_share(other_user_id)
--    Creates a conversation if none exists, returns conversation id
create or replace function public.get_or_create_conversation_for_share(p_other_user_id uuid)
returns uuid language plpgsql security definer as $$
declare
  v_conv_id  uuid;
  v_my_type  text;
  v_his_type text;
  v_artisan  uuid;
  v_customer uuid;
begin
  -- Return existing conversation
  select id into v_conv_id
  from public.conversations
  where (artisan_id = auth.uid() and customer_id = p_other_user_id)
     or (artisan_id = p_other_user_id and customer_id = auth.uid())
  limit 1;

  if v_conv_id is not null then
    return v_conv_id;
  end if;

  -- Determine roles based on account_type
  select account_type into v_my_type  from public.users where id = auth.uid();
  select account_type into v_his_type from public.users where id = p_other_user_id;

  if v_my_type = 'artisan' then
    v_artisan  := auth.uid();
    v_customer := p_other_user_id;
  elsif v_his_type = 'artisan' then
    v_artisan  := p_other_user_id;
    v_customer := auth.uid();
  else
    -- Both same type: current user as artisan_id by convention
    v_artisan  := auth.uid();
    v_customer := p_other_user_id;
  end if;

  insert into public.conversations (artisan_id, customer_id)
  values (v_artisan, v_customer)
  on conflict (artisan_id, customer_id) do update set last_message_at = now()
  returning id into v_conv_id;

  return v_conv_id;
end;
$$;
