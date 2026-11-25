-- Spotlight-level CV details: more than one agency, skill levels, a training list, weight, actual age (opt-in),
-- and a photographer credit for the headshot.

-- Extra agencies (e.g. a commercials agent alongside the theatrical one). Agency details are business contacts.
create table if not exists public.profile_agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text check (kind is null or char_length(kind) <= 40),      -- Theatrical, Commercial, Voice, Presenting…
  agency_name text not null check (char_length(agency_name) between 1 and 120),
  address text check (address is null or char_length(address) <= 300),
  phone text check (phone is null or char_length(phone) <= 60),
  email text check (email is null or char_length(email) <= 160),
  website text check (website is null or char_length(website) <= 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profile_agents enable row level security;
create policy "agents are public" on public.profile_agents for select to anon, authenticated using (true);
create policy "owner manages agents" on public.profile_agents for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
revoke all on public.profile_agents from anon, authenticated;
grant select on public.profile_agents to anon, authenticated;
grant insert, update, delete on public.profile_agents to authenticated;

-- Training: school, course, years (e.g. "Bird College", "BA (Hons) Professional Dance & Musical Theatre", "2014–2017")
create table if not exists public.profile_training (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  school text not null check (char_length(school) between 1 and 160),
  course text check (course is null or char_length(course) <= 200),
  years text check (years is null or char_length(years) <= 40),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profile_training enable row level security;
create policy "training is public" on public.profile_training for select to anon, authenticated using (true);
create policy "owner manages training" on public.profile_training for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
revoke all on public.profile_training from anon, authenticated;
grant select on public.profile_training to anon, authenticated;
grant insert, update, delete on public.profile_training to authenticated;

-- Skill level, as on Spotlight: Native (accents/languages), High standard, Highly skilled, Skilled
alter table public.profile_skills add column if not exists level text check (level is null or level in ('Native', 'High standard', 'Highly skilled', 'Skilled'));

-- Weight, headshot credit, and opt-in actual age (date of birth stays private; the age is worked out server-side)
alter table public.profiles
  add column if not exists weight text check (weight is null or char_length(weight) <= 40),
  add column if not exists headshot_credit text check (headshot_credit is null or char_length(headshot_credit) <= 80),
  add column if not exists show_age boolean not null default false;
grant select (weight, headshot_credit, show_age) on public.profiles to anon, authenticated;
grant insert (weight, headshot_credit, show_age), update (weight, headshot_credit, show_age) on public.profiles to authenticated;

-- Actual age: only returned when the member chose to show it (or to the member themselves)
create or replace function public.profile_age(pid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when p.date_of_birth is not null and (p.show_age or p.id = auth.uid())
    then date_part('year', age(current_date, p.date_of_birth))::int end
  from profiles p where p.id = pid
$$;
grant execute on function public.profile_age(uuid) to anon, authenticated;
-- Lets the owner know whether a date of birth is on file (without revealing it)
create or replace function public.has_date_of_birth() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select date_of_birth is not null from profiles where id = auth.uid()), false)
$$;
grant execute on function public.has_date_of_birth() to authenticated;
