-- Applied live 2026-10-04. Transparent pay on jobs (required by the new posting
-- form; old rows stay valid), the materials a role asks for, and a verified-
-- employer badge that only admins (dashboard / service key) can set.
alter table public.jobs
  add column if not exists is_paid boolean not null default true,
  add column if not exists pay_amount numeric(10,2),
  add column if not exists pay_unit text,
  add column if not exists pay_currency text not null default 'GBP',
  add column if not exists submit_materials text[] not null default array['showreel']::text[];

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_pay_unit_check') then
    alter table public.jobs add constraint jobs_pay_unit_check check (pay_unit is null or pay_unit in ('hour','day','week','month','show','shoot','fee'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_pay_amount_check') then
    alter table public.jobs add constraint jobs_pay_amount_check check (pay_amount is null or pay_amount >= 0);
  end if;
end $$;

alter table public.profiles add column if not exists is_verified boolean not null default false;

create or replace function public.protect_profile_verified()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.is_verified is distinct from old.is_verified
     and coalesce(auth.role(), '') in ('anon', 'authenticated') then
    new.is_verified := old.is_verified;
  end if;
  return new;
end $$;

revoke execute on function public.protect_profile_verified() from public, anon, authenticated;

create trigger trg_protect_profile_verified before update on public.profiles
  for each row execute function public.protect_profile_verified();
