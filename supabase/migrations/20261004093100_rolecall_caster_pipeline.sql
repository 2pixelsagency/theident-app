-- Applied live 2026-10-04. Caster pipeline: shortlist flag, invites, and a guard
-- so only the job owner moves the pipeline (applicants may withdraw, edit their
-- note, or sign the contract once booked).
alter table public.applications
  add column if not exists shortlisted boolean not null default false,
  add column if not exists invited boolean not null default false;

create or replace function public.applications_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare is_owner boolean;
begin
  NEW.updated_at := now();
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return NEW; end if;
  select exists(select 1 from jobs where id = NEW.job_id and created_by = auth.uid()) into is_owner;
  if is_owner then return NEW; end if;
  if NEW.job_id is distinct from OLD.job_id or NEW.profile_id is distinct from OLD.profile_id
     or NEW.status is distinct from OLD.status or NEW.shortlisted is distinct from OLD.shortlisted
     or NEW.invited is distinct from OLD.invited
     or NEW.due_at is distinct from OLD.due_at or NEW.held_from is distinct from OLD.held_from
     or NEW.held_to is distinct from OLD.held_to or NEW.next_step_note is distinct from OLD.next_step_note
     or NEW.contract_terms is distinct from OLD.contract_terms then
    raise exception 'Only the casting team can change this application';
  end if;
  if NEW.outcome is distinct from OLD.outcome and NEW.outcome is distinct from 'withdrawn' then
    raise exception 'Only the casting team can close this application';
  end if;
  if (NEW.contract_signed_at is distinct from OLD.contract_signed_at or NEW.contract_signature is distinct from OLD.contract_signature)
     and OLD.status <> 'booked' then
    raise exception 'The contract can only be signed once you are booked';
  end if;
  return NEW;
end $$;

revoke execute on function public.applications_guard() from public, anon, authenticated;

create trigger trg_applications_guard before update on public.applications
  for each row execute function public.applications_guard();

create policy "applications_insert_invite_by_job_owner" on public.applications
  for insert to authenticated
  with check (invited and status = 'audition' and exists (select 1 from jobs j where j.id = job_id and j.created_by = (select auth.uid())));

create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare j record; a record; role_name text;
begin
  select * into j from jobs where id = NEW.job_id;
  role_name := coalesce(nullif(concat_ws(' — ', j.project_in, j.project_role), ''), j.job_title, 'your job');
  if NEW.invited then
    insert into notifications (profile_id, title, body, type, data)
    values (NEW.profile_id, 'You''re invited to audition', role_name || ' would like to see you', 'application',
            jsonb_build_object('job_id', NEW.job_id::text, 'application_id', NEW.id::text, 'url', '/castings?focus=' || NEW.id::text));
  else
    select * into a from profiles where id = NEW.profile_id;
    insert into notifications (profile_id, title, body, type, data)
    values (j.created_by, 'New application',
            trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')) || ' applied for ' || role_name, 'application',
            jsonb_build_object('job_id', NEW.job_id::text, 'url', '/postings/' || NEW.job_id::text));
  end if;
  return NEW;
end $$;

-- Social proof on talent profiles ("On N casting shortlists this week") without
-- exposing other casters' applications: returns a count only.
create or replace function public.shortlist_count(pid uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from applications
  where profile_id = pid and outcome is null
    and (shortlisted or status in ('audition','callback','offer','booked'))
    and updated_at > now() - interval '7 days'
$$;
revoke execute on function public.shortlist_count(uuid) from public, anon;
grant execute on function public.shortlist_count(uuid) to authenticated;
