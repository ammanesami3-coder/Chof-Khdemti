-- Migration 0038: Presence privacy setting
-- Adds last_seen_hidden column so users can hide their "last seen" timestamp from others.
-- When true: last_seen_at is not shown to others and not written by usePresenceSystem.
-- Online status (green dot) is unaffected — user still appears online via Realtime Presence.

alter table public.profiles
  add column if not exists last_seen_hidden boolean not null default false;

comment on column public.profiles.last_seen_hidden
  is 'When true, last_seen_at is not exposed to other users and is not written on activity.';
