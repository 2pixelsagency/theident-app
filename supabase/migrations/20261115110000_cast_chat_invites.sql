-- Cast chat invites: a shareable link / 6-letter code any member can share, admins can switch off or reset.
-- Booking someone onto a production drops them into that production's cast chat automatically.
alter table public.cast_chats add column if not exists invite_code text;
alter table public.cast_chats add column if not exists invite_enabled boolean not null default true;

create or replace function public.new_cast_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    -- no 0/O/1/I/L so it reads cleanly when said out loud on set
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') into c from generate_series(1, 6);
    exit when not exists (select 1 from cast_chats where invite_code = c);
  end loop;
  return c;
end $$;

update public.cast_chats set invite_code = public.new_cast_invite_code() where invite_code is null;
alter table public.cast_chats alter column invite_code set default public.new_cast_invite_code();
alter table public.cast_chats alter column invite_code set not null;
create unique index if not exists cast_chats_invite_code_idx on public.cast_chats (invite_code);

-- Public preview of an invite (name + member count) so the join page can show what you're joining
create or replace function public.cast_chat_invite(code text)
returns table (chat_id uuid, name text, production_name text, members int, enabled boolean, already_member boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.production_name,
         (select count(*)::int from cast_chat_members m where m.chat_id = c.id),
         c.invite_enabled,
         exists (select 1 from cast_chat_members m where m.chat_id = c.id and m.profile_id = auth.uid())
  from cast_chats c where c.invite_code = upper(trim(code))
$$;

create or replace function public.join_cast_chat(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c cast_chats;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into c from cast_chats where invite_code = upper(trim(code));
  if c.id is null then raise exception 'invalid_code'; end if;
  if exists (select 1 from cast_chat_members where chat_id = c.id and profile_id = auth.uid()) then return c.id; end if;
  if not c.invite_enabled then raise exception 'invite_disabled'; end if;
  insert into cast_chat_members (chat_id, profile_id, role) values (c.id, auth.uid(), 'member');
  return c.id;
end $$;

create or replace function public.reset_cast_invite(cid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_cast_chat_admin(cid) then raise exception 'not_admin'; end if;
  c := new_cast_invite_code();
  update cast_chats set invite_code = c, invite_enabled = true where id = cid;
  return c;
end $$;

revoke execute on function public.cast_chat_invite(text), public.join_cast_chat(text), public.reset_cast_invite(uuid), public.new_cast_invite_code() from public, anon;
grant execute on function public.cast_chat_invite(text), public.join_cast_chat(text), public.reset_cast_invite(uuid) to authenticated;

-- Booked → into the production's cast chat (created on first booking, caster as admin)
create or replace function public.cast_chat_on_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jobs; cid uuid;
begin
  if NEW.status is distinct from 'booked' or (TG_OP = 'UPDATE' and OLD.status = 'booked') then return NEW; end if;
  select * into j from jobs where id = NEW.job_id;
  if j.id is null or j.created_by is null then return NEW; end if;
  select id into cid from cast_chats where production_job_id = j.id order by created_at limit 1;
  if cid is null then
    insert into cast_chats (name, production_job_id, production_name, created_by)
    values (coalesce(nullif(j.project_in, ''), nullif(j.job_title, ''), 'Cast') || ' cast', j.id, coalesce(nullif(j.project_in, ''), j.job_title), j.created_by)
    returning id into cid;
    insert into cast_chat_members (chat_id, profile_id, role) values (cid, j.created_by, 'admin') on conflict do nothing;
  end if;
  insert into cast_chat_members (chat_id, profile_id, role) values (cid, NEW.profile_id, 'member') on conflict do nothing;
  return NEW;
end $$;
revoke execute on function public.cast_chat_on_booking() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_cast_chat_on_booking') then
    create trigger trg_cast_chat_on_booking after insert or update of status on public.applications
      for each row execute function public.cast_chat_on_booking();
  end if;
end $$;
