-- Casting accounts get their own profile page: website, specialisms, and public casting stats
alter table public.profiles add column if not exists website text check (website is null or website ~* '^https?://');
alter table public.profiles add column if not exists specialisms text[];
grant select (website, specialisms) on public.profiles to anon, authenticated;

-- Live roles / roles posted / performers booked — counts only, safe to show publicly
create or replace function public.casting_stats(pid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'live', (select count(*) from jobs where created_by = pid and is_published and (application_deadline is null or application_deadline >= current_date)),
    'posted', (select count(*) from jobs where created_by = pid and is_published),
    'booked', (select count(*) from applications a join jobs j on j.id = a.job_id where j.created_by = pid and a.status = 'booked'))
$$;
grant execute on function public.casting_stats(uuid) to anon, authenticated;
