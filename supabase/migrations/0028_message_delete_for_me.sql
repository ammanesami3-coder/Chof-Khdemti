-- ══════════════════════════════════════════════════════════════
-- 0028 — Per-user message deletion (delete for me)
-- Adds deleted_by_user_ids to track which users deleted a message locally
-- ══════════════════════════════════════════════════════════════

alter table public.messages
  add column if not exists deleted_by_user_ids uuid[] not null default '{}';

create index if not exists messages_deleted_by_idx
  on public.messages using gin(deleted_by_user_ids);

-- RPC: safely append current user to deleted_by_user_ids (idempotent)
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
