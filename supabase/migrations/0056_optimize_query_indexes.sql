-- =============================================================
-- 0056_optimize_query_indexes.sql
--
-- Targeted indexes for the two hot-path RPCs that were still falling back
-- to sequential scans. Based on a static read of the query plans against
-- the existing index inventory (run EXPLAIN (ANALYZE, BUFFERS) on your data
-- to confirm the planner now picks these — see the notes per index).
--
-- Already covered, intentionally NOT re-added:
--   • get_user_conversations OR-filter        → conversations_artisan_idx /
--                                                conversations_customer_idx (0001)
--   • last-message LATERAL                     → messages_conversation_id_idx (0001)
--   • search_artisans equality filters         → idx_users_account_type,
--                                                idx_profiles_craft, idx_profiles_city (0007)
--   • get_notifications user + sort            → notifications_user_created_idx (0019)
--   • profiles.role lookups                    → primary key on profiles(user_id);
--                                                the only role= filter is the rare
--                                                admin moderators list — not worth an
--                                                index given the per-write cost.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Explore text search (search_artisans): full_name / username ILIKE '%q%'
--
--    The WHERE uses  u.full_name ILIKE '%'||p_q||'%'  and the same on username.
--    A leading-wildcard ILIKE can NOT use a plain btree (idx_users_username) and
--    is NOT served by the existing idx_users_fullname_trgm — despite its name
--    that index is a to_tsvector('simple', full_name) FTS GIN, which only
--    answers @@/to_tsquery, never ILIKE. So both columns were sequentially
--    scanned. pg_trgm GIN indexes make the substring ILIKE an index scan.
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_trgm;

create index if not exists idx_users_full_name_trgm
  on public.users using gin (full_name gin_trgm_ops);

create index if not exists idx_users_username_trgm
  on public.users using gin (username gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────
-- 2. Unread-count in get_user_conversations (the /messages list badge)
--
--    The unread LATERAL counts:
--      where conversation_id = c.id and is_read = false and sender_id <> auth.uid()
--    messages_conversation_id_idx (conversation_id, created_at desc) locates the
--    conversation's rows, but then every message in it is re-checked for
--    is_read — expensive for busy threads. A partial index over only the unread
--    rows lets the count touch just those. (sender_id <> auth.uid() is a dynamic
--    inequality and can't be indexed, but it's evaluated on a tiny set now.)
-- ─────────────────────────────────────────────────────────────
create index if not exists messages_unread_by_conversation_idx
  on public.messages (conversation_id)
  where is_read = false;

-- NOTE: these run as plain CREATE INDEX inside the migration transaction, which
-- takes a brief lock. On a large production messages/users table you may instead
-- run the three statements above manually with CREATE INDEX CONCURRENTLY
-- (outside a transaction) for zero-downtime, then mark this migration applied.
