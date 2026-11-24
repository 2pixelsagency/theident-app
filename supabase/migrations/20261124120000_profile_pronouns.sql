-- Pronouns on profiles (asked at sign-up, shown next to the name, editable in Customise profile).
-- profiles is granted per column: pronouns is public like the name; date_of_birth stays write-only.
alter table public.profiles add column if not exists pronouns text check (pronouns is null or char_length(pronouns) <= 40);
grant select (pronouns) on public.profiles to anon, authenticated;
grant insert (pronouns), update (pronouns) on public.profiles to authenticated;
