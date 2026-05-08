-- ══════════════════════════════════════════════════════════════
-- 0024 — Message reactions, reply-to-message, soft delete
-- ══════════════════════════════════════════════════════════════

-- ── reply-to-message ──────────────────────────────────────────
alter table public.messages
  add column if not exists reply_to_message_id uuid
    references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx
  on public.messages(reply_to_message_id)
  where reply_to_message_id is not null;

-- ── soft delete ───────────────────────────────────────────────
alter table public.messages
  add column if not exists deleted_at            timestamptz,
  add column if not exists deleted_for_everyone  boolean not null default false;

-- ── message_reactions ─────────────────────────────────────────
create table if not exists public.message_reactions (
  id          uuid      primary key default gen_random_uuid(),
  message_id  uuid      not null references public.messages(id) on delete cascade,
  user_id     uuid      not null references public.users(id)    on delete cascade,
  emoji       text      not null,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id)
);

-- Required for Realtime DELETE events to include old row data
alter table public.message_reactions replica identity full;

create index if not exists msg_reactions_msg_idx
  on public.message_reactions(message_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.message_reactions enable row level security;

create policy "reactions_select"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    )
  );

create policy "reactions_insert"
  on public.message_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and (c.artisan_id = auth.uid() or c.customer_id = auth.uid())
    )
  );

create policy "reactions_update"
  on public.message_reactions for update
  using (auth.uid() = user_id);

create policy "reactions_delete"
  on public.message_reactions for delete
  using (auth.uid() = user_id);

-- ── Enable Realtime replication ───────────────────────────────
-- Run in Supabase Dashboard → Database → Replication if not already enabled:
-- alter publication supabase_realtime add table public.message_reactions;
-- alter publication supabase_realtime add table public.messages; (already added likely)
