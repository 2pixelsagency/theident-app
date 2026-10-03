-- Applied live on 2026-10-03 via Supabase MCP from the design chat.
-- Commit so the repo matches the database.
-- "What's on" marketplace: public events hosted by users + RSVPs.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  host_name text,
  title text not null,
  event_type text not null default 'workshop',   -- audition | workshop | talk | webinar | premiere | other
  description text,
  cover_image_url text,
  start_date date not null,
  end_date date,
  start_time time,
  end_time time,
  all_day boolean default false,
  format text default 'in_person',               -- in_person | online
  venue text,
  online_url text,
  is_paid boolean default false,
  price numeric(10,2),
  currency text default 'GBP',
  capacity integer,
  is_featured boolean default false,             -- paid "feature it" (mirrors jobs.is_spotlighted)
  featured_expires_at timestamptz,
  status text default 'pending',                 -- pending | published | cancelled
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'going',                    -- going | interested | cancelled
  created_at timestamptz default now(),
  unique (event_id, profile_id)
);

create index if not exists events_start_date_idx on public.events (start_date);
create index if not exists events_published_idx on public.events (is_published);
create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id);
create index if not exists event_rsvps_profile_idx on public.event_rsvps (profile_id);

alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "events_select_published_or_own" on public.events
  for select using (is_published = true or created_by = auth.uid());
create policy "events_insert_own" on public.events
  for insert to authenticated with check (created_by = auth.uid());
create policy "events_update_own" on public.events
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "events_delete_own" on public.events
  for delete to authenticated using (created_by = auth.uid());

create policy "rsvps_select_own_or_host" on public.event_rsvps
  for select using (
    profile_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid())
  );
create policy "rsvps_insert_own" on public.event_rsvps
  for insert to authenticated with check (profile_id = auth.uid());
create policy "rsvps_update_own" on public.event_rsvps
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "rsvps_delete_own" on public.event_rsvps
  for delete to authenticated using (profile_id = auth.uid());

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_rsvps to authenticated;
