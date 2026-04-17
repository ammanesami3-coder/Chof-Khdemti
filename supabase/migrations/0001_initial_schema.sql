-- =============================================================
-- 0001_initial_schema.sql
-- الجداول الأساسية للمنصة
-- قابل للتشغيل عدة مرات (idempotent)
-- =============================================================

-- ---------------------------------------------------------------
-- users — يمتد من auth.users
-- ---------------------------------------------------------------
create table if not exists public.users (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        unique not null,
  full_name   text        not null,
  account_type text       not null check (account_type in ('artisan', 'customer')),
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.users enable row level security;

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id          uuid        primary key references public.users(id) on delete cascade,
  bio              text,
  avatar_url       text,
  cover_url        text,
  craft_category   text,
  city             text,
  years_experience int,
  is_verified      boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id             uuid        primary key default gen_random_uuid(),
  author_id      uuid        not null references public.users(id) on delete cascade,
  content        text,
  media          jsonb       not null default '[]'::jsonb,
  likes_count    int         not null default 0,
  comments_count int         not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.posts enable row level security;

create index if not exists posts_author_id_idx  on public.posts(author_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

-- ---------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------
create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  author_id  uuid        not null references public.users(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create index if not exists comments_post_id_idx on public.comments(post_id, created_at desc);

-- ---------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------
create table if not exists public.likes (
  user_id    uuid        not null references public.users(id) on delete cascade,
  post_id    uuid        not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.likes enable row level security;

-- ---------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid        not null references public.users(id) on delete cascade,
  following_id uuid        not null references public.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create index if not exists follows_follower_idx  on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

-- ---------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------
create table if not exists public.conversations (
  id                     uuid        primary key default gen_random_uuid(),
  artisan_id             uuid        not null references public.users(id) on delete cascade,
  customer_id            uuid        not null references public.users(id) on delete cascade,
  last_message_at        timestamptz not null default now(),
  first_artisan_reply_at timestamptz,
  created_at             timestamptz not null default now(),
  constraint conversations_unique_pair unique (artisan_id, customer_id)
);

alter table public.conversations enable row level security;

create index if not exists conversations_artisan_idx  on public.conversations(artisan_id, last_message_at desc);
create index if not exists conversations_customer_idx on public.conversations(customer_id, last_message_at desc);

-- ---------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------
create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references public.users(id) on delete cascade,
  content         text        not null,
  is_read         boolean     not null default false,
  created_at      timestamptz not null default now()
);

alter table public.messages enable row level security;

create index if not exists messages_conversation_id_idx
  on public.messages(conversation_id, created_at desc);

-- ---------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------
create table if not exists public.ratings (
  id          uuid        primary key default gen_random_uuid(),
  artisan_id  uuid        not null references public.users(id) on delete cascade,
  customer_id uuid        not null references public.users(id) on delete cascade,
  stars       int         not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  constraint ratings_one_per_customer unique (artisan_id, customer_id)
);

alter table public.ratings enable row level security;

create index if not exists ratings_artisan_id_idx on public.ratings(artisan_id);

-- ---------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- تطبيق trigger على الجداول التي تحتوي updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_users_updated_at'
  ) then
    create trigger trg_users_updated_at
      before update on public.users
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_profiles_updated_at'
  ) then
    create trigger trg_profiles_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;
end;
$$;
