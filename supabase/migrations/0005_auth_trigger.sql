-- =============================================================
-- 0005_auth_trigger.sql
-- Trigger على auth.users لإنشاء public.users + public.profiles
-- تلقائياً عند كل تسجيل جديد.
-- يضمن اتساق البيانات حتى لو فشل الـ Server Action.
-- =============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username    text;
  v_full_name   text;
  v_account_type text;
begin
  -- استخرج البيانات من raw_user_meta_data التي مررناها في options.data
  v_username     := coalesce(
                     new.raw_user_meta_data->>'username',
                     split_part(new.email, '@', 1)
                   );
  v_full_name    := coalesce(
                     new.raw_user_meta_data->>'full_name',
                     split_part(new.email, '@', 1)
                   );
  v_account_type := coalesce(
                     new.raw_user_meta_data->>'account_type',
                     'customer'
                   );

  -- أنشئ public.users (تجاهل إذا كان موجوداً بالفعل)
  insert into public.users (id, username, full_name, account_type)
  values (new.id, v_username, v_full_name, v_account_type)
  on conflict (id) do nothing;

  -- أنشئ public.profiles
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- أسقط الـ trigger القديم إن وجد
drop trigger if exists on_auth_user_created on auth.users;

-- أنشئ الـ trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
