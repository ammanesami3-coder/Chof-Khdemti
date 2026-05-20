-- Migration 0037: Add presence tracking to profiles
-- Adds last_seen_at column for offline timestamp display
-- Online status is tracked via Supabase Realtime Presence (not DB)

-- Add last_seen_at to profiles
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- Index for efficient querying (used when showing "last seen" in UI)
create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc nulls last);

-- Comment for clarity
comment on column public.profiles.last_seen_at
  is 'Updated on tab close / inactivity. Online status is determined by Realtime Presence, not this column.';
