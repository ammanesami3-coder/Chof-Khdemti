-- Migration 0048: Follow-list visibility settings
-- Adds per-user controls for who may see the *lists* of followers / following
-- (the counts themselves stay public). Surfaced on /settings/privacy.
--
--   who_can_see_followers   who may open this user's followers list
--   who_can_see_following   who may open this user's following list
--
--   'everyone'  -> anyone (default)
--   'followers' -> only users who follow this user
--   'none'      -> only the user themselves
--
-- Enforcement lives in the getFollowList server action (mirrors how
-- profile_visibility / who_can_message are enforced). The owner can always
-- see their own lists. RLS on profiles already restricts UPDATE to the owner.

alter table public.profiles
  add column if not exists who_can_see_followers text not null default 'everyone'
    check (who_can_see_followers in ('everyone', 'followers', 'none')),
  add column if not exists who_can_see_following text not null default 'everyone'
    check (who_can_see_following in ('everyone', 'followers', 'none'));

comment on column public.profiles.who_can_see_followers
  is 'Who may view this user''s followers list: everyone | followers | none.';
comment on column public.profiles.who_can_see_following
  is 'Who may view this user''s following list: everyone | followers | none.';
