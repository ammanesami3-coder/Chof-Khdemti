-- =============================================================
-- 0014_ratings_enhancements.sql
-- إضافات على ratings: updated_at، constraint الـ comment،
-- دوال get_artisan_rating / can_customer_rate، trigger updated_at
-- + إعادة تأكيد RLS policies (idempotent)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. عمود updated_at
-- ---------------------------------------------------------------
alter table public.ratings
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------
-- 2. constraint طول الـ comment (500 حرف)
-- ---------------------------------------------------------------
alter table public.ratings
  drop constraint if exists ratings_comment_length;

alter table public.ratings
  add constraint ratings_comment_length
    check (comment is null or char_length(comment) <= 500);

-- ---------------------------------------------------------------
-- 3. trigger updated_at — يستعمل set_updated_at() الموجودة في 0001
-- ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname    = 'trg_ratings_updated_at'
      and tgrelid   = 'public.ratings'::regclass
  ) then
    create trigger trg_ratings_updated_at
      before update on public.ratings
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- 4. RLS policies — إعادة إنشاء (تأكيد idempotent)
--    DELETE مقصود غيابه: RLS مفعّل + لا policy = منع تلقائي
-- ---------------------------------------------------------------
drop policy if exists "ratings_select_public"   on public.ratings;
drop policy if exists "ratings_insert_customer" on public.ratings;
drop policy if exists "ratings_update_own"      on public.ratings;

-- الكل يقرأ التقييمات
create policy "ratings_select_public"
  on public.ratings for select
  using (true);

-- الزبون فقط، ويجب أن يكون قد راسل الحرفي
create policy "ratings_insert_customer"
  on public.ratings for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.account_type = 'customer'
    )
    and exists (
      select 1 from public.conversations c
      where c.artisan_id  = ratings.artisan_id
        and c.customer_id = auth.uid()
    )
  );

-- الزبون يعدّل تقييمه فقط (لا حذف — حفاظ على السمعة)
create policy "ratings_update_own"
  on public.ratings for update
  using  (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------
-- 5. get_artisan_rating(p_artisan_id uuid)
--    → avg_stars: NULL إذا لا تقييمات، وإلا متوسط بخانة عشرية
--    → total_count: عدد التقييمات
-- ---------------------------------------------------------------
create or replace function public.get_artisan_rating(p_artisan_id uuid)
returns table(avg_stars numeric, total_count int)
language sql
security definer
stable
as $$
  select
    round(avg(stars)::numeric, 1) as avg_stars,
    count(*)::int                 as total_count
  from public.ratings
  where artisan_id = p_artisan_id;
$$;

-- ---------------------------------------------------------------
-- 6. can_customer_rate(p_artisan_id uuid, p_customer_id uuid)
--    → true : يوجد conversation بين الزبون والحرفي → حق التقييم
--    → false: لم يتراسلا → ممنوع
-- ---------------------------------------------------------------
create or replace function public.can_customer_rate(
  p_artisan_id  uuid,
  p_customer_id uuid
)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.conversations
    where artisan_id  = p_artisan_id
      and customer_id = p_customer_id
  );
$$;
