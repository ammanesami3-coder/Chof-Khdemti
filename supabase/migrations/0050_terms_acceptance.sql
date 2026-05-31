-- =============================================================
-- 0050_terms_acceptance.sql
-- Terms-of-Service acceptance gate for existing/old users.
--
-- Adds a nullable timestamp to profiles. NULL  = the user has not yet
-- accepted the current Terms & Privacy Policy → they are gated on next
-- login. A timestamp = the moment they accepted.
--
-- Existing rows keep NULL (no backfill) so every pre-existing user must
-- accept once. New signups set this at registration (see signUp action).
-- =============================================================

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_accepted_at is
  'When the user accepted the Terms & Privacy Policy. NULL = not yet accepted (user is gated at /auth/accept-terms).';
