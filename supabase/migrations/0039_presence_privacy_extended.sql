-- Migration 0039: Extend presence privacy controls
-- Adds online_hidden and typing_hidden so users can fully control presence visibility.
--
-- Privacy model (all enforced at the SOURCE — the broadcasting user):
--   online_hidden   = true  -> usePresenceSystem never calls channel.track()
--                              => the user is absent from Realtime Presence
--                              => no one sees the green "online" dot. Fully enforced.
--   last_seen_hidden = true -> last_seen_at is not written and is nulled out on read.
--                              Reciprocal: a user who hides last seen also stops
--                              seeing other users' last seen.
--   typing_hidden   = true  -> useTypingIndicator never broadcasts "typing".
--                              Reciprocal: that user also stops receiving typing events.
--
-- last_seen_hidden already exists (migration 0038).

alter table public.profiles
  add column if not exists online_hidden boolean not null default false;

alter table public.profiles
  add column if not exists typing_hidden boolean not null default false;

comment on column public.profiles.online_hidden
  is 'When true, the user never tracks Realtime Presence and never appears online to anyone.';

comment on column public.profiles.typing_hidden
  is 'When true, the user never broadcasts typing and (reciprocally) never sees others typing.';
