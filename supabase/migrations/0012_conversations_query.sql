-- =============================================================
-- 0012_conversations_query.sql
-- دالة get_user_conversations()
-- تُرجع قائمة محادثات المستخدم الحالي مع معلومات الشريك +
-- آخر رسالة + عدد الرسائل غير المقروءة
-- =============================================================

create or replace function public.get_user_conversations()
returns table (
  id                      uuid,
  artisan_id              uuid,
  customer_id             uuid,
  last_message_at         timestamptz,
  created_at              timestamptz,
  partner_id              uuid,
  partner_username        text,
  partner_full_name       text,
  partner_avatar_url      text,
  last_message_content    text,
  last_message_created_at timestamptz,
  last_message_sender_id  uuid,
  last_message_is_read    boolean,
  unread_count            bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.artisan_id,
    c.customer_id,
    c.last_message_at,
    c.created_at,

    -- الشريك: إذا أنا الحرفي → الشريك هو الزبون، والعكس
    case when c.artisan_id = auth.uid()
         then cu.id       else au.id       end  as partner_id,
    case when c.artisan_id = auth.uid()
         then cu.username  else au.username  end  as partner_username,
    case when c.artisan_id = auth.uid()
         then cu.full_name else au.full_name end  as partner_full_name,
    case when c.artisan_id = auth.uid()
         then cp.avatar_url else ap.avatar_url end as partner_avatar_url,

    -- آخر رسالة (LATERAL JOIN — استعلام واحد فقط)
    lm.content     as last_message_content,
    lm.created_at  as last_message_created_at,
    lm.sender_id   as last_message_sender_id,
    lm.is_read     as last_message_is_read,

    -- عدد الرسائل غير المقروءة المُرسَلة من الشريك
    coalesce(uc.cnt, 0) as unread_count

  from      public.conversations c
  join      public.users    au on au.id       = c.artisan_id
  left join public.profiles ap on ap.user_id  = c.artisan_id
  join      public.users    cu on cu.id       = c.customer_id
  left join public.profiles cp on cp.user_id  = c.customer_id

  -- آخر رسالة
  left join lateral (
    select m.content, m.created_at, m.sender_id, m.is_read
    from   public.messages m
    where  m.conversation_id = c.id
    order  by m.created_at desc
    limit  1
  ) lm on true

  -- عدد غير المقروء
  left join lateral (
    select count(*) as cnt
    from   public.messages m
    where  m.conversation_id = c.id
      and  m.is_read  = false
      and  m.sender_id != auth.uid()
  ) uc on true

  where c.artisan_id  = auth.uid()
     or c.customer_id = auth.uid()

  order by c.last_message_at desc;
$$;
