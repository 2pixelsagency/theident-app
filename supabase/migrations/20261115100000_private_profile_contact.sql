-- Profile editing (brief 03a): contact details are private.
-- Agent email/phone and date of birth are no longer readable through the API by other members or
-- the public. The owner (and anyone, if the owner turns on "Show agent contact") gets the agent
-- contact through public.profile_contact(). Everything else on profiles stays readable as before
-- (row access is still governed by the existing RLS policies).
--
-- Part 1 (additive, safe to apply before the code ships). The column lock is in
-- 20261115100100_lock_profile_contact_columns.sql and must be applied AFTER this code is live.

alter table public.profiles add column if not exists show_agent_contact boolean not null default false;

create or replace function public.profile_contact(pid uuid)
returns table (agent_email text, agent_phone text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select p.agent_email, p.agent_phone
  from public.profiles p
  where p.id = pid
    and (p.id = (select auth.uid()) or p.show_agent_contact)
$$;
revoke all on function public.profile_contact(uuid) from public;
grant execute on function public.profile_contact(uuid) to anon, authenticated;
