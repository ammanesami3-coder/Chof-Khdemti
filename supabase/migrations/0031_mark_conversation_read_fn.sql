-- =============================================================
-- 0031_mark_conversation_read_fn.sql
-- دالة security definer لتعليم رسائل المحادثة كمقروءة
-- سبب الحاجة: سياسة RLS تسمح فقط للمُرسِل بتعديل رسائله.
-- المستقبِل لا يملك صلاحية UPDATE على رسائل الشريك مباشرةً.
-- =============================================================

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artisan_id  uuid;
  v_customer_id uuid;
begin
  -- تحقق من أن المحادثة موجودة وأن المستخدم طرف فيها
  select artisan_id, customer_id
  into   v_artisan_id, v_customer_id
  from   public.conversations
  where  id = p_conversation_id;

  if not found then
    raise exception 'المحادثة غير موجودة';
  end if;

  if v_artisan_id != auth.uid() and v_customer_id != auth.uid() then
    raise exception 'غير مصرح';
  end if;

  -- عَلِّم جميع رسائل الشريك (غير المقروءة) كمقروءة
  update public.messages
  set    is_read = true
  where  conversation_id = p_conversation_id
    and  sender_id       != auth.uid()
    and  is_read          = false;
end;
$$;

-- امنح الصلاحية للمستخدمين المسجلين
grant execute on function public.mark_conversation_read(uuid) to authenticated;
