-- =============================================================
-- 0030_conversation_settings.sql
-- جدول إعدادات المحادثة لكل مستخدم (تثبيت، كتم، حذف محلي)
-- =============================================================

-- ── جدول conversation_settings ───────────────────────────────────────────────
create table if not exists public.conversation_settings (
  user_id           uuid        not null
                    references public.users(id)          on delete cascade,
  conversation_id   uuid        not null
                    references public.conversations(id)  on delete cascade,
  is_pinned         boolean     not null default false,
  pinned_at         timestamptz,
  is_muted          boolean     not null default false,
  muted_until       timestamptz,   -- null + is_muted = true → كتم دائم
  deleted_at        timestamptz,   -- حذف محلي: يخفي المحادثة من القائمة
  primary key (user_id, conversation_id)
);

alter table public.conversation_settings enable row level security;

create policy "users_manage_own_conv_settings"
  on public.conversation_settings
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists conv_settings_user_idx
  on public.conversation_settings (user_id);

-- ── trigger: استعادة المحادثة المحذوفة محلياً عند وصول رسالة جديدة ───────────
create or replace function public.restore_conv_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_settings
  set    deleted_at = null
  where  conversation_id = new.conversation_id
    and  user_id        != new.sender_id
    and  deleted_at      is not null;
  return new;
end;
$$;

drop trigger if exists trg_restore_conv_on_new_message on public.messages;
create trigger trg_restore_conv_on_new_message
  after insert on public.messages
  for each row
  execute function public.restore_conv_on_new_message();

-- =============================================================
-- تحديث دالة get_user_conversations
-- تُضاف أعمدة: is_pinned, pinned_at, is_muted, muted_until
-- الترتيب: المثبتة أولاً، ثم حسب آخر رسالة
-- الفلتر:  تُخفى المحادثات المحذوفة محلياً
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
  unread_count            bigint,
  is_pinned               boolean,
  pinned_at               timestamptz,
  is_muted                boolean,
  muted_until             timestamptz
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

    case when c.artisan_id = auth.uid()
         then cu.id        else au.id        end  as partner_id,
    case when c.artisan_id = auth.uid()
         then cu.username  else au.username  end  as partner_username,
    case when c.artisan_id = auth.uid()
         then cu.full_name else au.full_name end  as partner_full_name,
    case when c.artisan_id = auth.uid()
         then cp.avatar_url else ap.avatar_url end as partner_avatar_url,

    lm.content    as last_message_content,
    lm.created_at as last_message_created_at,
    lm.sender_id  as last_message_sender_id,
    lm.is_read    as last_message_is_read,

    coalesce(uc.cnt, 0)            as unread_count,
    coalesce(cs.is_pinned, false)  as is_pinned,
    cs.pinned_at,
    coalesce(cs.is_muted,  false)  as is_muted,
    cs.muted_until

  from      public.conversations c
  join      public.users    au on au.id      = c.artisan_id
  left join public.profiles ap on ap.user_id = c.artisan_id
  join      public.users    cu on cu.id      = c.customer_id
  left join public.profiles cp on cp.user_id = c.customer_id

  -- إعدادات خاصة بالمستخدم الحالي (left join: لا يُخفي المحادثات بدون إعدادات)
  left join public.conversation_settings cs
            on cs.conversation_id = c.id
           and cs.user_id         = auth.uid()

  -- آخر رسالة
  left join lateral (
    select m.content, m.created_at, m.sender_id, m.is_read
    from   public.messages m
    where  m.conversation_id = c.id
    order  by m.created_at desc
    limit  1
  ) lm on true

  -- عدد الرسائل غير المقروءة من الشريك
  left join lateral (
    select count(*) as cnt
    from   public.messages m
    where  m.conversation_id = c.id
      and  m.is_read  = false
      and  m.sender_id != auth.uid()
  ) uc on true

  where (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    -- null يعني لا يوجد سجل إعدادات → المحادثة مرئية
    and  cs.deleted_at is null

  order by
    coalesce(cs.is_pinned, false) desc,   -- المثبتة أولاً (true > false)
    c.last_message_at             desc;   -- ثم الأحدث
$$;
