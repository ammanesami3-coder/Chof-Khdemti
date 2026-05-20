-- Returns the subset of p_user_ids whose subscription is currently active.
-- Security-definer so callers (server actions, client RPCs) bypass RLS on `subscriptions`.
create or replace function public.get_subscribed_user_ids(p_user_ids uuid[])
returns uuid[]
language plpgsql security definer stable
as $$
begin
  return array(
    select user_id
    from   public.subscriptions
    where  user_id = any(p_user_ids)
      and  (
             status = 'active'
             or (status = 'trial' and trial_ends_at > now())
           )
  );
end;
$$;
