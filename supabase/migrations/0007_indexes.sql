-- Indexes for artisan discovery (explore page)

-- Filter by craft and city
create index if not exists idx_profiles_craft
  on public.profiles(craft_category);

create index if not exists idx_profiles_city
  on public.profiles(city);

-- Filter artisans fast
create index if not exists idx_users_account_type
  on public.users(account_type);

-- Text search on name and username
create index if not exists idx_users_fullname_trgm
  on public.users using gin(to_tsvector('simple', full_name));

create index if not exists idx_users_username
  on public.users(username);

-- Combined: artisans with completed onboarding
create index if not exists idx_profiles_onboarding
  on public.profiles(onboarding_complete)
  where onboarding_complete = true;
