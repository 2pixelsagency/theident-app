-- Applied live 2026-10-04. Four trigger functions inserted into
-- notifications.related_id (no such column) and used types the
-- notifications_type_check rejects, so job posting, application status changes
-- and community join/approve all failed. Rewritten against the real schema.

-- 1) New jobs: matching is handled by notify_job_matches (trg_job_match). This one
--    notified every user about every job; it's now a no-op.
create or replace function public.notify_on_new_job()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  return NEW;
end $$;

-- 2) Application pipeline changes → tell the performer (RoleCall stage names)
create or replace function public.notify_on_status_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  j record;
  role_name text;
  t text;
  b text;
begin
  if NEW.status is not distinct from OLD.status and NEW.outcome is not distinct from OLD.outcome then
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
    t := 'You''ve been recalled'; b := 'Recall for ' || role_name;
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
end $$;

-- 3) Community join request → tell the community owner
create or replace function public.notify_on_community_join()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; p record;
begin
  select * into c from communities where id = NEW.community_id;
  if c.owner_id is null or c.owner_id = NEW.profile_id then return NEW; end if;
  select first_name, last_name into p from profiles where id = NEW.profile_id;
  insert into notifications (profile_id, type, title, body, data)
  values (c.owner_id, 'system',
          case when NEW.status = 'pending' then 'New join request' else 'New member' end,
          trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ||
            case when NEW.status = 'pending' then ' asked to join ' else ' joined ' end || coalesce(c.name, 'your community'),
          jsonb_build_object('community_id', NEW.community_id::text, 'url', '/communities/' || coalesce(c.slug, '')));
  return NEW;
end $$;

-- 4) Community approval → tell the member
create or replace function public.notify_on_community_approved()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare c record;
begin
  if OLD.status is distinct from 'approved' and NEW.status = 'approved' then
    select * into c from communities where id = NEW.community_id;
    insert into notifications (profile_id, type, title, body, data)
    values (NEW.profile_id, 'system', 'You''re in', 'Your request to join ' || coalesce(c.name, 'the community') || ' was approved',
            jsonb_build_object('community_id', NEW.community_id::text, 'url', '/communities/' || coalesce(c.slug, '')));
  end if;
  return NEW;
end $$;

revoke execute on function public.notify_on_new_job(), public.notify_on_status_change(),
  public.notify_on_community_join(), public.notify_on_community_approved() from public, anon, authenticated;
grant execute on function public.notify_on_new_job(), public.notify_on_status_change(),
  public.notify_on_community_join(), public.notify_on_community_approved() to service_role;
