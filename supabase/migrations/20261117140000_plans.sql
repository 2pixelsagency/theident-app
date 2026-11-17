-- Paid membership: performers £1.99/mo, casting £10.99/mo (Stripe subscriptions). No free tier.
-- Members can't change their own plan fields — only the Stripe webhook (service role) can.
alter table public.profiles add column if not exists plan_status text;            -- trialing | active | past_due | canceled | null
alter table public.profiles add column if not exists plan_kind text;              -- performer | casting
alter table public.profiles add column if not exists plan_period_end timestamptz;
alter table public.profiles add column if not exists plan_grace_until timestamptz; -- free access window (existing members, comps)
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
grant select (plan_status, plan_kind, plan_period_end, plan_grace_until) on public.profiles to authenticated;

-- Existing real members get 30 days before they need a plan
update public.profiles set plan_grace_until = now() + interval '30 days' where not is_demo and plan_grace_until is null;

create or replace function public.protect_boost() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    NEW.boosted_until := OLD.boosted_until;
    NEW.plan_status := OLD.plan_status; NEW.plan_kind := OLD.plan_kind; NEW.plan_period_end := OLD.plan_period_end;
    NEW.plan_grace_until := OLD.plan_grace_until; NEW.stripe_customer_id := OLD.stripe_customer_id; NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  end if;
  return NEW;
end $$;

create or replace function public.has_plan(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_demo
      or (p.plan_status in ('active', 'trialing', 'past_due') and coalesce(p.plan_period_end, now() + interval '1 day') > now())
      or p.plan_grace_until > now()
    from profiles p where p.id = pid), false) or exists (select 1 from admin_emails a join auth.users u on lower(u.email) = a.email where u.id = pid)
$$;
grant execute on function public.has_plan(uuid) to authenticated;

-- Webhook writes plan state (service role only)
create or replace function public.apply_plan(p_profile uuid, p_customer text, p_subscription text, p_status text, p_kind text, p_period_end timestamptz) returns void
language sql security definer set search_path = public as $$
  update profiles set stripe_customer_id = coalesce(p_customer, stripe_customer_id), stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
    plan_status = p_status, plan_kind = coalesce(p_kind, plan_kind), plan_period_end = coalesce(p_period_end, plan_period_end)
  where id = p_profile
$$;
revoke execute on function public.apply_plan(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
