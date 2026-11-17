-- Admin dashboard graphs: per-day counts (real members/jobs only, demo excluded), 7–90 days
create or replace function public.admin_timeseries(days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  return (
    select jsonb_agg(jsonb_build_object(
      'day', d::date,
      'signups', (select count(*) from profiles p where not p.is_demo and p.created_at::date = d::date),
      'applications', (select count(*) from applications a join jobs j on j.id = a.job_id where not j.is_demo and a.created_at::date = d::date),
      'jobs', (select count(*) from jobs j where not j.is_demo and j.created_at::date = d::date),
      'messages', (select count(*) from messages m where m.created_at::date = d::date) + (select count(*) from cast_chat_messages c where c.created_at::date = d::date)
    ) order by d)
    from generate_series(current_date - (least(greatest(days, 7), 90) - 1), current_date, interval '1 day') d
  );
end $$;
revoke execute on function public.admin_timeseries(int) from public, anon;
grant execute on function public.admin_timeseries(int) to authenticated;
