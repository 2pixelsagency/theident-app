-- Public "N applied" counts for published jobs (numbers only — never who applied)
create or replace function public.job_application_counts(ids uuid[])
returns table (job_id uuid, applied integer)
language sql stable security definer set search_path = public as $$
  select a.job_id, count(*)::int
  from applications a join jobs j on j.id = a.job_id
  where a.job_id = any(ids) and j.is_published and coalesce(a.outcome, '') <> 'withdrawn'
  group by a.job_id
$$;
revoke execute on function public.job_application_counts(uuid[]) from public;
grant execute on function public.job_application_counts(uuid[]) to anon, authenticated;
