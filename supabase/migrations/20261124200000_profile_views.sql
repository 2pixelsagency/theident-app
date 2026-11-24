-- Profile views: anyone viewing a public profile logs a view; only the profile owner can read their own.
create table if not exists public.profile_views (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists profile_views_profile_created on public.profile_views (profile_id, created_at desc);
alter table public.profile_views enable row level security;
create policy "anyone logs a view" on public.profile_views for insert to anon, authenticated
  with check (viewer_id is null or viewer_id = (select auth.uid()));
create policy "owner reads own views" on public.profile_views for select to authenticated
  using (profile_id = (select auth.uid()));
grant insert on public.profile_views to anon, authenticated;
grant select on public.profile_views to authenticated;
