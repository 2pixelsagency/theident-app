-- Admin back office + chat safeguarding.
--  * admin_emails: who is an admin (change the email any time; is_admin() reads the signed-in email)
--  * reports: anyone can report a profile, message, cast-chat message or job
--  * user_blocks: block someone; blocked people can't message you
--  * moderation_flags: messages auto-flagged (off-platform contact, money, sexual, meeting alone) — high
--    severity when an under-18 is in the conversation
--  * suspensions: suspended accounts can't message, post or apply
--  * admins can read everything they need to review, via extra select policies

create table if not exists public.admin_emails (email text primary key check (email = lower(email)), added_at timestamptz not null default now());
alter table public.admin_emails enable row level security;
insert into public.admin_emails (email) values ('info@2pixelsagency.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_emails a join auth.users u on lower(u.email) = a.email where u.id = auth.uid())
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'admin_emails' and policyname = 'admin_emails_admin') then
    create policy "admin_emails_admin" on public.admin_emails for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
grant select, insert, delete on public.admin_emails to authenticated;

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'message', 'cast_message', 'job')),
  target_id uuid not null,
  reported_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('harassment', 'inappropriate', 'scam', 'underage', 'fake', 'off_platform', 'other')),
  details text check (length(details) <= 2000),
  snapshot text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  admin_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

-- Blocks
create table if not exists public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;

-- Suspensions
create table if not exists public.suspensions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  reason text,
  until timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security;

-- Auto-flags on chat messages
create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('message', 'cast_message')),
  message_id uuid not null,
  thread_id uuid not null,
  sender_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  categories text[] not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  minor_involved boolean not null default false,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  admin_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists moderation_flags_status_idx on public.moderation_flags (status, severity, created_at desc);
alter table public.moderation_flags enable row level security;

create or replace function public.is_minor(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select date_of_birth > (current_date - interval '18 years') from profiles where id = pid), false)
$$;
create or replace function public.is_suspended(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from suspensions where profile_id = pid and (until is null or until > now()))
$$;
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;
revoke execute on function public.is_minor(uuid), public.is_suspended(uuid), public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_minor(uuid), public.is_suspended(uuid), public.is_blocked_between(uuid, uuid) to authenticated;

-- What we look for. Deliberately simple and explainable; admins make the call.
create or replace function public.flag_categories(body text) returns text[]
language sql immutable as $$
  select array_remove(array[
    case when body ~* '(\+?\d[\d\s().-]{8,}\d)|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|\m(whatsapp|whats app|snapchat|snap me|telegram|signal app|kik|insta(gram)? me|dm me on|text me on)\M' then 'off_platform' end,
    case when body ~* '\m(bank details|sort code|account number|paypal me|pay (a|the|your) (fee|deposit)|registration fee|upfront (fee|payment)|western union|gift ?cards?|crypto|bitcoin)\M' then 'money' end,
    case when body ~* '\m(nude|nudes|naked|sexy pics?|send pics|topless|lingerie shoot|onlyfans|sexual|hook ?up)\M' then 'sexual' end,
    case when body ~* '\m(come alone|don''?t tell (anyone|your (mum|mom|dad|parents))|our (little )?secret|hotel room|my (flat|place|house) (tonight|after)|meet (me )?(alone|privately))\M' then 'grooming' end
  ], null)
$$;

create or replace function public.flag_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare cats text[]; thread uuid; src text; minor boolean := false; sev text;
begin
  cats := flag_categories(NEW.body);
  if TG_TABLE_NAME = 'messages' then
    src := 'message'; thread := NEW.conversation_id;
    select is_minor(c.user_a) or is_minor(c.user_b) into minor from conversations c where c.id = NEW.conversation_id;
  else
    src := 'cast_message'; thread := NEW.chat_id;
    select exists (select 1 from cast_chat_members m where m.chat_id = NEW.chat_id and is_minor(m.profile_id)) into minor;
  end if;
  if coalesce(array_length(cats, 1), 0) = 0 then return NEW; end if;
  sev := case when 'grooming' = any(cats) or 'sexual' = any(cats) or (minor and 'off_platform' = any(cats)) then 'high'
              when 'money' = any(cats) or minor then 'medium' else 'low' end;
  insert into moderation_flags (source, message_id, thread_id, sender_id, body, categories, severity, minor_involved)
  values (src, NEW.id, thread, NEW.sender_id, left(NEW.body, 2000), cats, sev, coalesce(minor, false));
  return NEW;
end $$;
revoke execute on function public.flag_message() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_flag_message') then
    create trigger trg_flag_message after insert on public.messages for each row execute function public.flag_message();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_flag_cast_message') then
    create trigger trg_flag_cast_message after insert on public.cast_chat_messages for each row execute function public.flag_message();
  end if;
end $$;

-- Policies
do $$ begin
  -- reports: file your own; read your own; admins read + resolve all
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'reports_insert_own') then
    create policy "reports_insert_own" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
    create policy "reports_select_own_or_admin" on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or public.is_admin());
    create policy "reports_update_admin" on public.reports for update to authenticated using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_blocks' and policyname = 'user_blocks_own') then
    create policy "user_blocks_own" on public.user_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
    create policy "user_blocks_admin_read" on public.user_blocks for select to authenticated using (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'suspensions' and policyname = 'suspensions_admin') then
    create policy "suspensions_admin" on public.suspensions for all to authenticated using (public.is_admin()) with check (public.is_admin());
    create policy "suspensions_self_read" on public.suspensions for select to authenticated using (profile_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'moderation_flags' and policyname = 'moderation_flags_admin') then
    create policy "moderation_flags_admin" on public.moderation_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
  -- blocked or suspended: can't send (restrictive, on top of the existing rules)
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'messages_not_blocked_or_suspended') then
    create policy "messages_not_blocked_or_suspended" on public.messages as restrictive for insert to authenticated
      with check (not public.is_suspended((select auth.uid())) and not exists (
        select 1 from conversations c where c.id = conversation_id
          and public.is_blocked_between(c.user_a, c.user_b)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'cast_chat_messages' and policyname = 'cast_messages_not_suspended') then
    create policy "cast_messages_not_suspended" on public.cast_chat_messages as restrictive for insert to authenticated with check (not public.is_suspended((select auth.uid())));
    create policy "applications_not_suspended" on public.applications as restrictive for insert to authenticated with check (not public.is_suspended((select auth.uid())));
    create policy "jobs_not_suspended" on public.jobs as restrictive for insert to authenticated with check (not public.is_suspended((select auth.uid())));
    create policy "conversations_not_blocked" on public.conversations as restrictive for insert to authenticated with check (not public.is_blocked_between(user_a, user_b));
  end if;
  -- admins can review conversations and chats
  if not exists (select 1 from pg_policies where tablename = 'messages' and policyname = 'messages_admin_read') then
    create policy "messages_admin_read" on public.messages for select to authenticated using (public.is_admin());
    create policy "conversations_admin_read" on public.conversations for select to authenticated using (public.is_admin());
    create policy "cast_chat_messages_admin" on public.cast_chat_messages for select to authenticated using (public.is_admin());
    create policy "cast_chat_messages_admin_delete" on public.cast_chat_messages for delete to authenticated using (public.is_admin());
    create policy "messages_admin_delete" on public.messages for delete to authenticated using (public.is_admin());
    create policy "cast_chats_admin_read" on public.cast_chats for select to authenticated using (public.is_admin());
    create policy "cast_chat_members_admin_read" on public.cast_chat_members for select to authenticated using (public.is_admin());
    create policy "applications_admin_read" on public.applications for select to authenticated using (public.is_admin());
    create policy "jobs_admin_all" on public.jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;
grant select, insert, update on public.reports to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert, update, delete on public.suspensions to authenticated;
grant select, update on public.moderation_flags to authenticated;

-- Admin overview + member search (needs auth emails, so it's a definer function gated on is_admin)
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  return jsonb_build_object(
    'members', (select count(*) from profiles where not is_demo),
    'performers', (select count(*) from profiles where not is_demo and coalesce(account_role, 'performer') <> 'caster'),
    'casting', (select count(*) from profiles where not is_demo and account_role = 'caster'),
    'new_7d', (select count(*) from profiles where not is_demo and created_at > now() - interval '7 days'),
    'live_jobs', (select count(*) from jobs where is_published and not is_demo and (application_deadline is null or application_deadline >= current_date)),
    'applications_7d', (select count(*) from applications a join jobs j on j.id = a.job_id where not j.is_demo and a.created_at > now() - interval '7 days'),
    'messages_7d', (select count(*) from messages where created_at > now() - interval '7 days') + (select count(*) from cast_chat_messages where created_at > now() - interval '7 days'),
    'open_flags', (select count(*) from moderation_flags where status = 'open'),
    'high_flags', (select count(*) from moderation_flags where status = 'open' and severity = 'high'),
    'open_reports', (select count(*) from reports where status = 'open'),
    'suspended', (select count(*) from suspensions where until is null or until > now()),
    'demo_accounts', (select count(*) from profiles where is_demo)
  );
end $$;

create or replace function public.admin_members(q text default '', lim int default 50)
returns table (id uuid, email text, first_name text, last_name text, account_role text, created_at timestamptz, last_active timestamptz,
               email_verified boolean, is_demo boolean, is_minor boolean, suspended boolean, reports int, flags int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  return query
  select p.id, u.email::text, p.first_name, p.last_name, p.account_role, p.created_at, p.last_active, p.email_verified, p.is_demo, public.is_minor(p.id), public.is_suspended(p.id),
    (select count(*)::int from reports r where r.reported_profile_id = p.id), (select count(*)::int from moderation_flags f where f.sender_id = p.id)
  from profiles p left join auth.users u on u.id = p.id
  where q = '' or (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '') || ' ' || coalesce(u.email, '') || ' ' || coalesce(p.company_name, '')) ilike '%' || q || '%'
  order by p.created_at desc limit lim;
end $$;
revoke execute on function public.admin_stats(), public.admin_members(text, int) from public, anon;
grant execute on function public.admin_stats(), public.admin_members(text, int) to authenticated;
