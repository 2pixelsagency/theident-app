-- Members can't switch between performer and casting once set up (the plan price depends on it).
-- Allowed only during sign-up: no membership yet and the account is under a day old. Admins/service role can still change it.
create or replace function public.protect_boost() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    NEW.boosted_until := OLD.boosted_until;
    NEW.plan_status := OLD.plan_status; NEW.plan_kind := OLD.plan_kind; NEW.plan_period_end := OLD.plan_period_end;
    NEW.plan_grace_until := OLD.plan_grace_until; NEW.stripe_customer_id := OLD.stripe_customer_id; NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    if NEW.account_role is distinct from OLD.account_role
       and (OLD.plan_status is not null or OLD.created_at < now() - interval '1 day') then
      NEW.account_role := OLD.account_role;
    end if;
  end if;
  return NEW;
end $$;
revoke execute on function public.protect_boost() from public, anon, authenticated;
