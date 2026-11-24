-- Spotlight/Mandy-level profile details. All optional and self-described; arrays so people can pick
-- more than one (mixed heritage, dual nationality, several bases, a range of genders they can play).
alter table public.profiles
  add column if not exists extra_locations text[],   -- can also work as a local in
  add column if not exists nationalities text[],
  add column if not exists right_to_work text[],     -- e.g. UK, Ireland, EU, USA
  add column if not exists appearance text[],        -- self-described ethnic appearance (pick any, or write your own)
  add column if not exists playing_genders text[],   -- genders they can play
  add column if not exists multiple_birth text check (multiple_birth is null or multiple_birth in ('Twin', 'Identical twin', 'Triplet')),
  add column if not exists hair_length text check (hair_length is null or char_length(hair_length) <= 30),
  add column if not exists hair_type text check (hair_type is null or char_length(hair_type) <= 30),
  add column if not exists agency_name text check (agency_name is null or char_length(agency_name) <= 120),
  add column if not exists agent_address text check (agent_address is null or char_length(agent_address) <= 300);

grant select (extra_locations, nationalities, right_to_work, appearance, playing_genders, multiple_birth, hair_length, hair_type, agency_name, agent_address)
  on public.profiles to anon, authenticated;
grant insert (extra_locations, nationalities, right_to_work, appearance, playing_genders, multiple_birth, hair_length, hair_type, agency_name, agent_address),
      update (extra_locations, nationalities, right_to_work, appearance, playing_genders, multiple_birth, hair_length, hair_type, agency_name, agent_address)
  on public.profiles to authenticated;

-- Disability & access: private by default. Only the member can read it unless they choose to show it.
create table if not exists public.profile_access (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  disabilities text[],
  access_notes text check (access_notes is null or char_length(access_notes) <= 600),
  visible boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profile_access enable row level security;
create policy "owner manages access details" on public.profile_access for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "shown access details are public" on public.profile_access for select to anon, authenticated
  using (visible);
grant select on public.profile_access to anon, authenticated;
grant insert, update, delete on public.profile_access to authenticated;
