-- =============================================================
-- 0004_subscriptions.sql
-- نظام الاشتراك (Lemon Squeezy) + Quota المحادثات
-- قابل للتشغيل عدة مرات (idempotent)
-- =============================================================

-- ---------------------------------------------------------------
-- ENUM: subscription_status
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'subscription_status'
  ) then
    create type public.subscription_status as enum (
      'trial',       -- لديه quota متبقية
      'quota_used',  -- استنفذ الـ 5 ولم يشترك
      'active',      -- اشتراك Lemon Squeezy نشط
      'past_due',    -- فشل الدفع، مهلة 3 أيام
      'cancelled'    -- ألغى الاشتراك
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------
create table if not exists public.subscriptions (
  id                    uuid                      primary key default gen_random_uuid(),
  user_id               uuid                      not null references public.users(id) on delete cascade,
  lemon_subscription_id text                      unique,
  lemon_customer_id     text,
  lemon_variant_id      text,
  status                public.subscription_status not null default 'trial',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean                   not null default false,
  created_at            timestamptz               not null default now(),
  updated_at            timestamptz               not null default now(),
  constraint subscriptions_one_per_user unique (user_id)
);

alter table public.subscriptions enable row level security;

-- المستخدم يقرأ اشتراكه فقط
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- INSERT/UPDATE فقط عبر service role (من webhook handler)
-- لا توجد client-facing policies للكتابة

-- trigger لـ updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_subscriptions_updated_at'
  ) then
    create trigger trg_subscriptions_updated_at
      before update on public.subscriptions
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- conversation_quota
-- ---------------------------------------------------------------
create table if not exists public.conversation_quota (
  id              uuid        primary key default gen_random_uuid(),
  artisan_id      uuid        not null references public.users(id) on delete cascade,
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  consumed_at     timestamptz not null default now(),
  constraint cq_unique_pair unique (artisan_id, conversation_id)
);

alter table public.conversation_quota enable row level security;

create index if not exists cq_artisan_idx on public.conversation_quota(artisan_id);

-- الحرفي يقرأ quota الخاص به فقط
drop policy if exists "cq_select_own" on public.conversation_quota;
create policy "cq_select_own"
  on public.conversation_quota for select
  using (artisan_id = auth.uid());

-- لا كتابة من client — يتولى الـ trigger و service role ذلك

-- ---------------------------------------------------------------
-- webhook_events (idempotency log)
-- ---------------------------------------------------------------
create table if not exists public.webhook_events (
  id           uuid        primary key default gen_random_uuid(),
  provider     text        not null,
  event_id     text        not null,
  event_type   text        not null,
  payload      jsonb       not null,
  processed_at timestamptz not null default now(),
  constraint webhook_events_unique_event unique (event_id)
);

alter table public.webhook_events enable row level security;

-- لا قراءة من client. فقط service role.

-- ---------------------------------------------------------------
-- can_artisan_reply() — هل يستطيع الحرفي الرد على هذه المحادثة؟
-- ---------------------------------------------------------------
create or replace function public.can_artisan_reply(
  p_artisan_id      uuid,
  p_conversation_id uuid
)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_status        public.subscription_status;
  v_quota_used    int;
  v_is_in_quota   boolean;
begin
  -- 1. هل لديه اشتراك نشط؟
  select status into v_status
  from public.subscriptions
  where user_id = p_artisan_id;

  if v_status = 'active' then
    return true;
  end if;

  -- 2. هل هذه المحادثة محسوبة مسبقاً من الـ quota؟
  select exists(
    select 1 from public.conversation_quota
    where artisan_id      = p_artisan_id
    and   conversation_id = p_conversation_id
  ) into v_is_in_quota;

  if v_is_in_quota then
    return true;  -- محادثة مفتوحة مسبقاً — يستمر فيها بحرية
  end if;

  -- 3. هل لا يزال لديه quota متبقية؟
  select count(*) into v_quota_used
  from public.conversation_quota
  where artisan_id = p_artisan_id;

  return v_quota_used < 5;
end;
$$;

-- ---------------------------------------------------------------
-- consume_quota_on_reply() — trigger يُشغَّل بعد كل رسالة جديدة
-- ---------------------------------------------------------------
create or replace function public.consume_quota_on_reply()
returns trigger
language plpgsql
security definer
as $$
declare
  v_artisan_id       uuid;
  v_is_artisan_msg   boolean;
  v_already_consumed boolean;
  v_quota_count      int;
begin
  -- هل المرسل هو الحرفي في هذه المحادثة؟
  select
    (c.artisan_id = new.sender_id),
    c.artisan_id
  into v_is_artisan_msg, v_artisan_id
  from public.conversations c
  where c.id = new.conversation_id;

  -- إذا الرسالة من الزبون — لا شيء نفعله
  if not v_is_artisan_msg then
    return new;
  end if;

  -- هل سبق واستهلكنا quota لهذه المحادثة؟
  select exists(
    select 1 from public.conversation_quota
    where conversation_id = new.conversation_id
  ) into v_already_consumed;

  if v_already_consumed then
    return new;  -- محادثة موجودة مسبقاً في الـ quota
  end if;

  -- استهلك الـ quota وسجّل أول رد
  insert into public.conversation_quota (artisan_id, conversation_id)
  values (v_artisan_id, new.conversation_id)
  on conflict (artisan_id, conversation_id) do nothing;

  -- سجّل وقت أول رد في المحادثة
  update public.conversations
  set first_artisan_reply_at = now()
  where id = new.conversation_id
  and first_artisan_reply_at is null;

  -- هل استنفذ الحرفي الـ 5 محادثات المجانية الآن؟
  select count(*) into v_quota_count
  from public.conversation_quota
  where artisan_id = v_artisan_id;

  if v_quota_count >= 5 then
    update public.subscriptions
    set status     = 'quota_used',
        updated_at = now()
    where user_id = v_artisan_id
    and   status  = 'trial';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_consume_quota'
  ) then
    create trigger trg_consume_quota
      after insert on public.messages
      for each row execute function public.consume_quota_on_reply();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- إنشاء subscription تلقائياً للحرفي عند التسجيل
-- ---------------------------------------------------------------
create or replace function public.create_artisan_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.account_type = 'artisan' then
    insert into public.subscriptions (user_id, status)
    values (new.id, 'trial')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_create_artisan_subscription'
  ) then
    create trigger trg_create_artisan_subscription
      after insert on public.users
      for each row execute function public.create_artisan_subscription();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- get_artisan_quota_status() — دالة مساعدة للـ UI
-- تُرجع حالة الـ quota للحرفي دفعة واحدة
-- ---------------------------------------------------------------
create or replace function public.get_artisan_quota_status(p_artisan_id uuid)
returns table (
  status           public.subscription_status,
  conversations_used int,
  conversations_max  int,
  can_send         boolean
)
language plpgsql
security definer
stable
as $$
declare
  v_status      public.subscription_status;
  v_used        int;
begin
  select s.status into v_status
  from public.subscriptions s
  where s.user_id = p_artisan_id;

  select count(*) into v_used
  from public.conversation_quota cq
  where cq.artisan_id = p_artisan_id;

  return query select
    coalesce(v_status, 'trial'::public.subscription_status),
    v_used,
    5,
    (v_status = 'active' or v_used < 5);
end;
$$;
