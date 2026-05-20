-- Migration 0040: Visibility & privacy settings
-- Per-user controls surfaced on /settings/privacy. Until now these three
-- settings only lived in localStorage and had no real effect.
--
--   profile_visibility  who may see the profile page & its posts
--                       'everyone'  -> public (default)
--                       'followers' -> only users who follow the owner
--                       'none'      -> only the owner
--   who_can_message     who may start a conversation with the user
--                       'everyone'  -> anyone (default)
--                       'followers' -> only users who follow the user
--   who_can_comment     who may comment on the user's posts
--                       'everyone'  -> anyone (default)
--                       'followers' -> only users who follow the post author
--                       'none'      -> comments disabled (author only)
--
-- Enforcement lives in the server actions / pages that perform the writes;
-- RLS on profiles already restricts UPDATE to `user_id = auth.uid()`.

alter table public.profiles
  add column if not exists profile_visibility text not null default 'everyone'
    check (profile_visibility in ('everyone', 'followers', 'none')),
  add column if not exists who_can_message text not null default 'everyone'
    check (who_can_message in ('everyone', 'followers')),
  add column if not exists who_can_comment text not null default 'everyone'
    check (who_can_comment in ('everyone', 'followers', 'none'));

comment on column public.profiles.profile_visibility
  is 'Who may view this profile and its posts: everyone | followers | none.';
comment on column public.profiles.who_can_message
  is 'Who may start a conversation with this user: everyone | followers.';
comment on column public.profiles.who_can_comment
  is 'Who may comment on this user''s posts: everyone | followers | none.';
