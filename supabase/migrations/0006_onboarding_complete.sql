-- إضافة حقل onboarding_complete لجدول profiles
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;
