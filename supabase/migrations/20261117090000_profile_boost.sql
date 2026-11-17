-- Profile boost (Stripe Checkout): boosted performers show first in Talent search with a Featured label.
-- Only the Stripe webhook (service role) can set boosted_until; members can't give themselves a boost.
alter table public.profiles add column if not exists boosted_until timestamptz;
grant select (boosted_until) on public.profiles to anon, authenticated;

create or replace function public.protect_boost() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then NEW.boosted_until := OLD.boosted_until; end if;
  return NEW;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_protect_boost') then
    create trigger trg_protect_boost before update on public.profiles for each row execute function public.protect_boost();
  end if;
end $$;

create table if not exists public.boost_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_session_id text not null unique,
  amount_pence integer not null,
  currency text not null default 'gbp',
  days integer not null,
  boosted_until timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.boost_payments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'boost_payments' and policyname = 'boost_payments_own_read') then
    create policy "boost_payments_own_read" on public.boost_payments for select to authenticated using (profile_id = (select auth.uid()) or public.is_admin());
  end if;
end $$;
grant select on public.boost_payments to authenticated;

-- Called by the webhook (service role): extend from now or from the current end, whichever is later; idempotent per session
create or replace function public.apply_boost(p_profile uuid, p_session text, p_days int, p_amount int, p_currency text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare until timestamptz;
begin
  select boosted_until into until from boost_payments where stripe_session_id = p_session;
  if until is not null then return until; end if;
  select greatest(coalesce(boosted_until, now()), now()) + make_interval(days => p_days) into until from profiles where id = p_profile;
  update profiles set boosted_until = until where id = p_profile;
  insert into boost_payments (profile_id, stripe_session_id, amount_pence, currency, days, boosted_until) values (p_profile, p_session, p_amount, p_currency, p_days, until);
  return until;
end $$;
revoke execute on function public.apply_boost(uuid, text, int, int, text) from public, anon, authenticated;
