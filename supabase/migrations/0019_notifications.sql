-- =====================================================================
-- 0019_notifications.sql — Facebook-style notifications system
-- =====================================================================

-- 1. Enum
create type public.notification_type as enum (
  'like',           -- أعجب بمنشورك
  'comment',        -- علّق على منشورك
  'comment_reply',  -- ردّ على تعليقك
  'comment_like',   -- أعجب بتعليقك
  'follow'          -- بدأ متابعتك
);

-- 2. Table
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id)    on delete cascade,
  actor_id   uuid not null references public.users(id)    on delete cascade,
  type       public.notification_type not null,
  post_id    uuid references public.posts(id)              on delete cascade,
  comment_id uuid references public.comments(id)           on delete cascade,
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  constraint no_self_notification check (user_id <> actor_id)
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id)
  where not is_read;

-- 3. RLS
alter table public.notifications enable row level security;

create policy "users_read_own_notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users_update_own_notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "users_delete_own_notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

-- 4. Trigger: إعجاب بمنشور
create or replace function public.notify_on_post_like()
returns trigger language plpgsql security definer as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (v_author, new.user_id, 'like', new.post_id);
  return new;
end;
$$;

create trigger trg_notify_post_like
  after insert on public.likes
  for each row execute function public.notify_on_post_like();

-- 5. Trigger: تعليق على منشور أو ردّ على تعليق
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer as $$
declare
  v_post_author   uuid;
  v_parent_author uuid;
begin
  select author_id into v_post_author from public.posts where id = new.post_id;

  if new.parent_comment_id is null then
    -- تعليق من المستوى الأول: أشعِر صاحب المنشور
    if v_post_author is not null and v_post_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
      values (v_post_author, new.author_id, 'comment', new.post_id, new.id);
    end if;
  else
    -- ردّ: أشعِر صاحب التعليق الأصلي فقط
    select author_id into v_parent_author
      from public.comments where id = new.parent_comment_id;
    if v_parent_author is not null and v_parent_author <> new.author_id then
      insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
      values (v_parent_author, new.author_id, 'comment_reply', new.post_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_notify_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 6. Trigger: إعجاب بتعليق
create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer as $$
declare
  v_comment_author uuid;
  v_post_id        uuid;
begin
  select author_id, post_id into v_comment_author, v_post_id
    from public.comments where id = new.comment_id;
  if v_comment_author is null or v_comment_author = new.user_id then return new; end if;
  insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
  values (v_comment_author, new.user_id, 'comment_like', v_post_id, new.comment_id);
  return new;
end;
$$;

create trigger trg_notify_comment_like
  after insert on public.comment_likes
  for each row execute function public.notify_on_comment_like();

-- 7. Trigger: متابعة
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

create trigger trg_notify_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 8. RPC: قائمة الإشعارات المُخصّبة
create or replace function public.get_notifications(
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  id               uuid,
  type             text,
  is_read          boolean,
  created_at       timestamptz,
  post_id          uuid,
  comment_id       uuid,
  actor_id         uuid,
  actor_username   text,
  actor_full_name  text,
  actor_avatar_url text,
  post_media       jsonb
)
language sql security definer stable as $$
  select
    n.id,
    n.type::text,
    n.is_read,
    n.created_at,
    n.post_id,
    n.comment_id,
    n.actor_id,
    u.username,
    u.full_name,
    pr.avatar_url,
    po.media
  from  public.notifications n
  join  public.users      u  on u.id      = n.actor_id
  left join public.profiles  pr on pr.user_id = n.actor_id
  left join public.posts     po on po.id      = n.post_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit  p_limit
  offset p_offset;
$$;

-- 9. RPC: عدد الإشعارات غير المقروءة
create or replace function public.get_unread_notifications_count()
returns int language sql security definer stable as $$
  select count(*)::int
  from public.notifications
  where user_id = auth.uid() and not is_read;
$$;

-- 10. Enable Realtime on notifications table
-- (run this manually in Supabase Dashboard → Database → Replication if not done)
-- alter publication supabase_realtime add table public.notifications;
