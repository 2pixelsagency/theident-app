-- Members opt in to having their headshot shown on the public website (theident.me). Off by default.
alter table public.profiles add column if not exists feature_on_site boolean not null default false;
grant select (feature_on_site) on public.profiles to anon, authenticated;
