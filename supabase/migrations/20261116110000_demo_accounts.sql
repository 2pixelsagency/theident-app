-- App Store / review demo accounts ("robots"). Demo content is visible but tagged:
--  * profiles.is_demo / jobs.is_demo
--  * real (non-demo) users can't apply to demo jobs
--  * demo jobs never send "New role for you" alerts to real performers
-- Remove everything with supabase/demo/remove_demo.sql.
alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.jobs add column if not exists is_demo boolean not null default false;
grant select (is_demo) on public.profiles to anon, authenticated;

create or replace function public.is_demo_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from profiles where id = auth.uid()), false)
$$;
revoke execute on function public.is_demo_user() from public, anon;
grant execute on function public.is_demo_user() to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'applications' and policyname = 'applications_demo_only_for_demo') then
    create policy "applications_demo_only_for_demo" on public.applications as restrictive for insert to authenticated
      with check (not exists (select 1 from jobs j where j.id = job_id and j.is_demo) or public.is_demo_user());
  end if;
end $$;

-- Skip demo jobs in role-match alerts (body otherwise unchanged)
do $$ declare def text; begin
  def := pg_get_functiondef('public.notify_job_matches'::regproc);
  if position('NEW.is_demo' in def) = 0 then
    execute replace(def, 'if NEW.is_published is not true then return NEW; end if;', 'if NEW.is_published is not true or NEW.is_demo then return NEW; end if;');
  end if;
end $$;
