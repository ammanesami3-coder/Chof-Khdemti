-- ردود التعليقات (مستوى واحد فقط)
alter table public.comments
  add column if not exists parent_comment_id uuid
  references public.comments(id) on delete cascade;

-- عدّاد الإعجابات
alter table public.comments
  add column if not exists likes_count int default 0 not null;

-- جدول إعجابات التعليقات
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique (comment_id, user_id)
);

create index if not exists comment_likes_comment_idx on public.comment_likes(comment_id);

alter table public.comment_likes enable row level security;

create policy "Comment likes visible to all"
  on public.comment_likes for select using (true);

create policy "Users like comments"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create policy "Users unlike own"
  on public.comment_likes for delete
  using (auth.uid() = user_id);

-- Triggers لـ likes_count
create or replace function public.inc_comment_likes()
returns trigger language plpgsql as $$
begin
  update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
  return new;
end; $$;

create or replace function public.dec_comment_likes()
returns trigger language plpgsql as $$
begin
  update public.comments set likes_count = greatest(likes_count - 1, 0)
    where id = old.comment_id;
  return old;
end; $$;

create trigger trg_inc_comment_likes after insert on public.comment_likes
  for each row execute function public.inc_comment_likes();

create trigger trg_dec_comment_likes after delete on public.comment_likes
  for each row execute function public.dec_comment_likes();

-- index للـ replies
create index if not exists comments_parent_idx on public.comments(parent_comment_id);
