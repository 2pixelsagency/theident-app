-- Theatre digs: members list their own place; it goes live after an admin approves it (and again after edits).
-- Enquiries notify the host, who can reply in a normal (safeguarded) chat.
alter table public.digs add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.digs add column if not exists price_per_week numeric;
alter table public.digs add column if not exists images text[] not null default '{}';
alter table public.digs add column if not exists review_status text not null default 'approved' check (review_status in ('pending', 'approved', 'rejected'));
alter table public.digs add column if not exists review_note text;
alter table public.digs add column if not exists updated_at timestamptz not null default now();
alter table public.digs alter column tags set default '{}';
alter table public.digs alter column stays set default 0;

-- Non-admins can't publish themselves: every insert/edit by the owner goes (back) to review
create or replace function public.digs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  NEW.updated_at := now();
  if public.is_admin() or coalesce(auth.role(), '') not in ('anon', 'authenticated') then return NEW; end if;
  if TG_OP = 'INSERT' then NEW.owner_id := auth.uid(); end if;
  NEW.is_published := false;
  NEW.review_status := 'pending';
  NEW.rating := case when TG_OP = 'UPDATE' then OLD.rating else null end;
  NEW.stays := case when TG_OP = 'UPDATE' then OLD.stays else 0 end;
  return NEW;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_digs_guard') then
    create trigger trg_digs_guard before insert or update on public.digs for each row execute function public.digs_guard();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'digs' and policyname = 'digs_owner_all') then
    create policy "digs_owner_all" on public.digs for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
    create policy "digs_admin_all" on public.digs for all to authenticated using (public.is_admin()) with check (public.is_admin());
    create policy "digs_insert_not_suspended" on public.digs as restrictive for insert to authenticated with check (not public.is_suspended((select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'digs_enquiries' and policyname = 'digs_enquiries_host_read') then
    create policy "digs_enquiries_host_read" on public.digs_enquiries for select to authenticated
      using (exists (select 1 from digs d where d.id = dig_id and d.owner_id = (select auth.uid())) or public.is_admin());
  end if;
end $$;
grant select, insert, update, delete on public.digs to authenticated;

-- Tell the host about a new enquiry
create or replace function public.notify_digs_enquiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare d digs; who text;
begin
  if NEW.kind <> 'enquiry' or NEW.dig_id is null then return NEW; end if;
  select * into d from digs where id = NEW.dig_id;
  if d.owner_id is null or d.owner_id = NEW.profile_id then return NEW; end if;
  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'A performer') into who from profiles where id = NEW.profile_id;
  insert into notifications (profile_id, type, title, body, data)
  values (d.owner_id, 'digs', 'New digs enquiry', who || ' asked about ' || d.title || coalesce(' · ' || NEW.dates, ''),
          jsonb_build_object('url', '/digs?mine=1', 'dig_id', d.id::text, 'enquiry_id', NEW.id::text));
  return NEW;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_notify_digs_enquiry') then
    create trigger trg_notify_digs_enquiry after insert on public.digs_enquiries for each row execute function public.notify_digs_enquiry();
  end if;
end $$;

-- Host replies → open (or reuse) a direct chat with the enquirer, without needing to be connected first
create or replace function public.reply_to_digs_enquiry(enquiry uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare e digs_enquiries; d digs; cid uuid;
begin
  select * into e from digs_enquiries where id = enquiry;
  select * into d from digs where id = e.dig_id;
  if d.owner_id is distinct from auth.uid() then raise exception 'not_host'; end if;
  if is_blocked_between(d.owner_id, e.profile_id) or is_suspended(d.owner_id) then raise exception 'blocked'; end if;
  select id into cid from conversations where (user_a = d.owner_id and user_b = e.profile_id) or (user_a = e.profile_id and user_b = d.owner_id) limit 1;
  if cid is null then
    insert into conversations (user_a, user_b) values (d.owner_id, e.profile_id) returning id into cid;
  end if;
  return cid;
end $$;
revoke execute on function public.reply_to_digs_enquiry(uuid) from public, anon;
grant execute on function public.reply_to_digs_enquiry(uuid) to authenticated;

-- Allow the new notification type
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['job_match', 'connection', 'application', 'message', 'profile_view', 'system', 'digs']));
