-- =============================================================
-- 0002_rls_policies.sql
-- Row Level Security policies لكل الجداول
-- قابل للتشغيل عدة مرات — يحذف الـ policy القديمة قبل إعادة إنشائها
-- =============================================================

-- helper macro: أسقط الـ policy إن وجدت ثم أنشئها من جديد
-- (PostgreSQL لا يدعم CREATE OR REPLACE POLICY مباشرة قبل v15)

-- ===============================================================
-- users
-- ===============================================================
drop policy if exists "users_select_public"   on public.users;
drop policy if exists "users_insert_own"       on public.users;
drop policy if exists "users_update_own"       on public.users;

-- الجميع يقرأ (بيانات عامة: username, full_name, account_type)
create policy "users_select_public"
  on public.users for select
  using (true);

-- كل مستخدم ينشئ row واحدة لنفسه فقط (يُستدعى من Server Action بعد التسجيل)
create policy "users_insert_own"
  on public.users for insert
  with check (id = auth.uid());

-- كل مستخدم يعدّل بياناته فقط
create policy "users_update_own"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===============================================================
-- profiles
-- ===============================================================
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own"    on public.profiles;
drop policy if exists "profiles_update_own"    on public.profiles;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===============================================================
-- posts
-- ===============================================================
drop policy if exists "posts_select_public"   on public.posts;
drop policy if exists "posts_insert_artisan"  on public.posts;
drop policy if exists "posts_update_own"      on public.posts;
drop policy if exists "posts_delete_own"      on public.posts;

create policy "posts_select_public"
  on public.posts for select
  using (true);

-- الحرفيون فقط ينشرون
create policy "posts_insert_artisan"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.account_type = 'artisan'
    )
  );

create policy "posts_update_own"
  on public.posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "posts_delete_own"
  on public.posts for delete
  using (author_id = auth.uid());

-- ===============================================================
-- comments
-- ===============================================================
drop policy if exists "comments_select_public"  on public.comments;
drop policy if exists "comments_insert_auth"    on public.comments;
drop policy if exists "comments_delete_own"     on public.comments;
drop policy if exists "comments_delete_post_owner" on public.comments;

create policy "comments_select_public"
  on public.comments for select
  using (true);

create policy "comments_insert_auth"
  on public.comments for insert
  with check (author_id = auth.uid());

create policy "comments_delete_own"
  on public.comments for delete
  using (author_id = auth.uid());

-- صاحب المنشور يحذف أي تعليق عليه
create policy "comments_delete_post_owner"
  on public.comments for delete
  using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id
      and p.author_id = auth.uid()
    )
  );

-- ===============================================================
-- likes
-- ===============================================================
drop policy if exists "likes_select_public"  on public.likes;
drop policy if exists "likes_insert_own"     on public.likes;
drop policy if exists "likes_delete_own"     on public.likes;

create policy "likes_select_public"
  on public.likes for select
  using (true);

create policy "likes_insert_own"
  on public.likes for insert
  with check (user_id = auth.uid());

create policy "likes_delete_own"
  on public.likes for delete
  using (user_id = auth.uid());

-- ===============================================================
-- follows
-- ===============================================================
drop policy if exists "follows_select_public" on public.follows;
drop policy if exists "follows_insert_own"    on public.follows;
drop policy if exists "follows_delete_own"    on public.follows;

create policy "follows_select_public"
  on public.follows for select
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  with check (follower_id = auth.uid());

create policy "follows_delete_own"
  on public.follows for delete
  using (follower_id = auth.uid());

-- ===============================================================
-- conversations
-- ===============================================================
drop policy if exists "conversations_select_parties"  on public.conversations;
drop policy if exists "conversations_insert_customer" on public.conversations;

-- فقط الطرفان يريان المحادثة
create policy "conversations_select_parties"
  on public.conversations for select
  using (
    artisan_id = auth.uid()
    or customer_id = auth.uid()
  );

-- الزبون هو من يبدأ المحادثة دائماً
create policy "conversations_insert_customer"
  on public.conversations for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.account_type = 'customer'
    )
  );

-- ===============================================================
-- messages
-- ===============================================================
drop policy if exists "messages_select_parties"  on public.messages;
drop policy if exists "messages_insert_parties"  on public.messages;

-- فقط أطراف المحادثة يقرؤون الرسائل
create policy "messages_select_parties"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    )
  );

-- فقط أطراف المحادثة يرسلون
create policy "messages_insert_parties"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    )
  );

-- ===============================================================
-- ratings
-- ===============================================================
drop policy if exists "ratings_select_public"    on public.ratings;
drop policy if exists "ratings_insert_customer"  on public.ratings;
drop policy if exists "ratings_update_own"       on public.ratings;

create policy "ratings_select_public"
  on public.ratings for select
  using (true);

-- الزبون يقيّم حرفياً تواصل معه فقط
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
      and   c.customer_id = auth.uid()
    )
  );

create policy "ratings_update_own"
  on public.ratings for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
