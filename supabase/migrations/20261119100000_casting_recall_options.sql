-- Recall options (another tape / video call with link / in person), tapes sent after applying, NDA signing from Castings.
-- Applied to the live project via MCP; this file mirrors it.
alter table public.applications add column if not exists recall_kind text check (recall_kind in ('in_person', 'video_call', 'self_tape'));
alter table public.applications add column if not exists meeting_url text check (meeting_url is null or meeting_url ~* '^https://');
alter table public.applications add column if not exists tape_sent_at timestamptz;
alter table public.applications add column if not exists nda_signed_name text;

create or replace function public.applications_guard()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare is_owner boolean;
begin
  NEW.updated_at := now();
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return NEW; end if;
  select exists(select 1 from jobs where id = NEW.job_id and created_by = auth.uid()) into is_owner;
  if is_owner then
    -- A fresh request resets the "tape sent" marker
    if NEW.status is distinct from OLD.status or NEW.recall_kind is distinct from OLD.recall_kind or NEW.due_at is distinct from OLD.due_at then NEW.tape_sent_at := null; end if;
    return NEW;
  end if;
  if NEW.job_id is distinct from OLD.job_id or NEW.profile_id is distinct from OLD.profile_id
     or NEW.status is distinct from OLD.status or NEW.shortlisted is distinct from OLD.shortlisted
     or NEW.invited is distinct from OLD.invited
     or NEW.due_at is distinct from OLD.due_at or NEW.held_from is distinct from OLD.held_from
     or NEW.held_to is distinct from OLD.held_to or NEW.next_step_note is distinct from OLD.next_step_note
     or NEW.contract_terms is distinct from OLD.contract_terms
     or NEW.recall_kind is distinct from OLD.recall_kind or NEW.meeting_url is distinct from OLD.meeting_url then
    raise exception 'Only the casting team can change this application';
  end if;
  if NEW.outcome is distinct from OLD.outcome and NEW.outcome is distinct from 'withdrawn' then
    raise exception 'Only the casting team can close this application';
  end if;
  if (NEW.contract_signed_at is distinct from OLD.contract_signed_at or NEW.contract_signature is distinct from OLD.contract_signature)
     and OLD.status <> 'booked' then
    raise exception 'The contract can only be signed once you are booked';
  end if;
  -- An NDA, once signed, stays signed
  if OLD.nda_signed and (NEW.nda_signed is distinct from true or NEW.nda_signed_at is distinct from OLD.nda_signed_at or NEW.nda_signed_name is distinct from OLD.nda_signed_name) then
    raise exception 'The NDA is already signed';
  end if;
  return NEW;
end $function$;

create or replace function public.notify_on_status_change()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare j record; role_name text; t text; b text;
begin
  if NEW.status is not distinct from OLD.status and NEW.outcome is not distinct from OLD.outcome
     and NEW.recall_kind is not distinct from OLD.recall_kind then
    return NEW;
  end if;
  select * into j from jobs where id = NEW.job_id;
  role_name := coalesce(nullif(concat_ws(' — ', j.project_in, j.project_role), ''), j.job_title, 'a role');
  if NEW.outcome = 'declined' and OLD.outcome is distinct from 'declined' then
    t := 'Application update'; b := 'Not this time for ' || role_name || '. Keep going.';
  elsif NEW.outcome is not null then
    return NEW;
  elsif NEW.status = 'audition' then
    t := 'Self-tape requested'; b := role_name || ' would like a self-tape';
  elsif NEW.status = 'callback' then
    t := 'You''ve been recalled';
    b := case NEW.recall_kind when 'self_tape' then role_name || ' would like another self-tape'
                              when 'video_call' then 'Video call recall for ' || role_name
                              else 'Recall for ' || role_name end;
  elsif NEW.status = 'offer' then
    t := 'You''ve been pencilled'; b := role_name || ' has pencilled you';
  elsif NEW.status = 'booked' then
    t := 'You''re booked!'; b := 'Sign your contract for ' || role_name;
  else
    t := 'Application update'; b := 'Your application for ' || role_name || ' was updated';
  end if;
  insert into notifications (profile_id, type, title, body, data)
  values (NEW.profile_id, 'application', t, b,
          jsonb_build_object('job_id', NEW.job_id::text, 'application_id', NEW.id::text,
                             'url', case when NEW.status = 'booked' then '/castings/' || NEW.id::text || '/contract' else '/castings?focus=' || NEW.id::text end));
  return NEW;
end $function$;
drop trigger if exists on_application_status_change on public.applications;
create trigger on_application_status_change after update on public.applications for each row execute function public.notify_on_status_change();

-- Tell the casting team when a requested tape arrives
create or replace function public.notify_tape_sent() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare j record; who text;
begin
  if NEW.tape_sent_at is null or NEW.tape_sent_at is not distinct from OLD.tape_sent_at then return NEW; end if;
  select * into j from jobs where id = NEW.job_id;
  select coalesce(nullif(concat_ws(' ', first_name, last_name), ''), 'An applicant') into who from profiles where id = NEW.profile_id;
  insert into notifications (profile_id, type, title, body, data)
  values (j.created_by, 'application', 'Self-tape received', who || ' sent a self-tape for ' || coalesce(nullif(concat_ws(' — ', j.project_in, j.project_role), ''), j.job_title, 'your role'),
          jsonb_build_object('job_id', NEW.job_id::text, 'application_id', NEW.id::text, 'url', '/postings/' || NEW.job_id::text));
  return NEW;
end $$;
revoke execute on function public.notify_tape_sent() from public, anon, authenticated;
drop trigger if exists on_application_tape_sent on public.applications;
create trigger on_application_tape_sent after update of tape_sent_at on public.applications for each row execute function public.notify_tape_sent();
