-- Brief 02: make notification settings real.
-- profiles.notification_prefs keys (all default on): messages, cast_chats, applications, matches, connections.
-- Push respects every key; "matches" also stops the in-app role-match alerts (they're a broadcast).

create or replace function public.notification_pref_key(ntype text, ndata jsonb) returns text
language sql immutable as $$
  select case
    when ntype = 'message' and ndata ? 'cast_chat_id' then 'cast_chats'
    when ntype = 'message' then 'messages'
    when ntype = 'application' then 'applications'
    when ntype = 'job_match' then 'matches'
    when ntype = 'connection' then 'connections'
    else ntype end
$$;

create or replace function public.push_wanted(pid uuid, ntype text, ndata jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (p.notification_prefs ->> public.notification_pref_key(ntype, ndata))::boolean from profiles p where p.id = pid), true)
$$;
revoke execute on function public.push_wanted(uuid, text, jsonb) from public, anon, authenticated;

-- Gate the existing push webhook trigger (function body unchanged) on the person's push settings
do $$ begin
  execute 'drop trigger if exists trg_push_notify on public.notifications';
  execute 'create trigger trg_push_notify after insert on public.notifications for each row
           when (public.push_wanted(NEW.profile_id, NEW.type, NEW.data)) execute function public.push_notify_devices()';
end $$;

-- Register this device for push. Endpoints are unique per browser, so a shared device moves to whoever enabled it last.
create or replace function public.register_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into push_subscriptions (profile_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;
revoke execute on function public.register_push(text, text, text) from public, anon;
grant execute on function public.register_push(text, text, text) to authenticated;

-- Role matches: respect the "matches" setting; point at the current Find route
create or replace function public.notify_job_matches() returns trigger
language plpgsql security definer set search_path = public as $$
declare job_min_age int; job_max_age int; has_criteria boolean;
begin
  if NEW.is_published is not true then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.is_published is true then return NEW; end if;
  begin
    job_min_age := nullif(regexp_replace(split_part(coalesce(NEW.age_range,''), '-', 1), '\D', '', 'g'), '')::int;
    job_max_age := nullif(regexp_replace(split_part(coalesce(NEW.age_range,''), '-', 2), '\D', '', 'g'), '')::int;
  exception when others then job_min_age := null; job_max_age := null;
  end;
  has_criteria := (NEW.gender_ids is not null and array_length(NEW.gender_ids,1) is not null)
    or (NEW.ethnicity_ids is not null and array_length(NEW.ethnicity_ids,1) is not null)
    or (NEW.hair_colour_ids is not null and array_length(NEW.hair_colour_ids,1) is not null)
    or (NEW.eye_colour_ids is not null and array_length(NEW.eye_colour_ids,1) is not null)
    or (job_min_age is not null)
    or exists (select 1 from job_skills js where js.job_id = NEW.id);
  if not has_criteria then return NEW; end if;
  insert into notifications (profile_id, type, title, body, data, read)
  select p.id, 'job_match', 'New role for you',
    coalesce(nullif(NEW.job_title,''), nullif(NEW.project_role,''), 'New role') || coalesce(' · ' || nullif(NEW.location,''), ''),
    jsonb_build_object('url', '/find/' || NEW.id::text, 'job_id', NEW.id::text), false
  from profiles p
  where p.id <> NEW.created_by
    and coalesce(p.show_talent, true) = true
    and coalesce((p.notification_prefs ->> 'matches')::boolean, true)
    and coalesce(p.account_role, 'performer') <> 'caster'
    and (NEW.gender_ids is null or array_length(NEW.gender_ids,1) is null or p.gender_id = any(NEW.gender_ids))
    and (NEW.ethnicity_ids is null or array_length(NEW.ethnicity_ids,1) is null or p.ethnicity_id = any(NEW.ethnicity_ids))
    and (NEW.hair_colour_ids is null or array_length(NEW.hair_colour_ids,1) is null or p.hair_colour_id = any(NEW.hair_colour_ids))
    and (NEW.eye_colour_ids is null or array_length(NEW.eye_colour_ids,1) is null or p.eye_colour_id = any(NEW.eye_colour_ids))
    and (job_min_age is null or job_max_age is null or (coalesce(p.maximum_age, 200) >= job_min_age and coalesce(p.minimum_age, 0) <= job_max_age))
    and (not exists (select 1 from job_skills js where js.job_id = NEW.id)
         or exists (select 1 from profile_skills ps join job_skills js2 on js2.skill_id = ps.skill_id where ps.profile_id = p.id and js2.job_id = NEW.id));
  return NEW;
end $$;

-- In-app: live notifications while the app is open (RLS limits each person to their own rows)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
