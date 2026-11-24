-- CV import (AI): one row per import, used to cap imports per member per day. Written by the API route
-- with the service role; members can read their own rows. No client insert/update/delete.
create table if not exists public.cv_imports (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ok boolean not null default false
);
create index if not exists cv_imports_profile_created on public.cv_imports (profile_id, created_at desc);
alter table public.cv_imports enable row level security;
drop policy if exists "read own cv imports" on public.cv_imports;
create policy "read own cv imports" on public.cv_imports for select to authenticated using (profile_id = auth.uid());
revoke insert, update, delete on public.cv_imports from anon, authenticated;
