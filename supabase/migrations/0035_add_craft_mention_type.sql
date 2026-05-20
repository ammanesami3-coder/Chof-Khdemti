-- Must run alone (separate transaction) before 0036_craft_keywords.sql
-- because ALTER TYPE ADD VALUE cannot be used in the same transaction
-- as code that references the new enum value.
alter type public.notification_type add value if not exists 'craft_mention';
