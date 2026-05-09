-- ══════════════════════════════════════════════════════════════
-- 0029 — Add UPDATE policy for messages + ensure 0028 content
-- ══════════════════════════════════════════════════════════════
-- Root cause: messages table had SELECT + INSERT policies only.
-- UPDATE was silently rejected by RLS, breaking both delete paths.
-- ══════════════════════════════════════════════════════════════

-- Allow the original sender to update their own messages
-- (needed for: delete-for-everyone, future edits)
drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
  on public.messages for update
  using (sender_id = auth.uid());

-- ── Ensure 0028 content is applied (idempotent) ───────────────

alter table public.messages
  add column if not exists deleted_by_user_ids uuid[] not null default '{}';

create index if not exists messages_deleted_by_idx
  on public.messages using gin(deleted_by_user_ids);

create or replace function public.mark_message_deleted_for_me(p_message_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_artisan_id  uuid;
  v_customer_id uuid;
begin
  select c.artisan_id, c.customer_id
  into v_artisan_id, v_customer_id
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where m.id = p_message_id;

  if not found then
    raise exception 'الرسالة غير موجودة';
  end if;

  if v_artisan_id != auth.uid() and v_customer_id != auth.uid() then
    raise exception 'غير مصرح';
  end if;

  update public.messages
  set deleted_by_user_ids = array_append(deleted_by_user_ids, auth.uid())
  where id = p_message_id
    and not (auth.uid() = any(deleted_by_user_ids));
end;
$$;
