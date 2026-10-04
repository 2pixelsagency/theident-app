-- Applied live 2026-10-04.
-- Events: hosts can't publish or feature their own events (they go live after
-- review; featuring is a paid upsell, requested via feature_requested).
alter table public.events add column if not exists feature_requested boolean not null default false;

create or replace function public.events_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  NEW.updated_at := now();
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return NEW; end if;
  if TG_OP = 'INSERT' then
    NEW.status := 'pending'; NEW.is_published := false; NEW.is_featured := false; NEW.featured_expires_at := null;
  else
    NEW.is_published := OLD.is_published; NEW.is_featured := OLD.is_featured; NEW.featured_expires_at := OLD.featured_expires_at;
    if NEW.status is distinct from OLD.status and NEW.status <> 'cancelled' then NEW.status := OLD.status; end if;
  end if;
  return NEW;
end $$;
revoke execute on function public.events_guard() from public, anon, authenticated;
create trigger trg_events_guard before insert or update on public.events
  for each row execute function public.events_guard();

-- "N spots left" without exposing who RSVP'd
create or replace function public.event_going_count(eid uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::int from event_rsvps where event_id = eid and status = 'going'
$$;
revoke execute on function public.event_going_count(uuid) from public, anon;
grant execute on function public.event_going_count(uuid) to authenticated;

-- Public bucket for event cover images, uploads into the host's own folder
insert into storage.buckets (id, name, public) values ('event-covers', 'event-covers', true) on conflict (id) do nothing;
create policy "event covers upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Theatre digs: admin-curated directory with an Enquire button (host self-listing later)
create table if not exists public.digs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_name text,
  host_note text,
  city text not null,
  area text,
  near_venue text,
  walk_minutes integer,
  price_per_night numeric(8,2),
  description text,
  tags text[] not null default '{}',
  rating numeric(2,1),
  stays integer not null default 0,
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists digs_city_idx on public.digs (lower(city)) where is_published;

create table if not exists public.digs_enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'enquiry' check (kind in ('enquiry','host_interest')),
  dig_id uuid references public.digs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  dates text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.digs enable row level security;
alter table public.digs_enquiries enable row level security;
create policy "digs_select_published" on public.digs for select to authenticated using (is_published);
create policy "digs_enquiries_insert_own" on public.digs_enquiries for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "digs_enquiries_select_own" on public.digs_enquiries for select to authenticated using (profile_id = (select auth.uid()));
grant select on public.digs to authenticated;
grant select, insert on public.digs_enquiries to authenticated;
