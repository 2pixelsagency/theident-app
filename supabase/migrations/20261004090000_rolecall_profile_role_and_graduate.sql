-- Applied live 2026-10-04. Onboarding role (drives the role-aware nav),
-- caster company name, and the graduate tag (flag + school + year).
alter table public.profiles
  add column if not exists account_role text not null default 'performer',
  add column if not exists company_name text,
  add column if not exists is_graduate boolean not null default false,
  add column if not exists graduate_school text,
  add column if not exists graduate_year integer;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_role_check') then
    alter table public.profiles add constraint profiles_account_role_check check (account_role in ('performer','caster'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_graduate_year_check') then
    alter table public.profiles add constraint profiles_graduate_year_check check (graduate_year is null or graduate_year between 1950 and 2100);
  end if;
end $$;

create index if not exists profiles_is_graduate_idx on public.profiles (is_graduate) where is_graduate;
