-- Classes board: pass on a class space you can't use (free or asking price, settled between members — no payment in app),
-- or promote a class/workshop you teach. Interested members message the poster.
create table if not exists public.class_spaces (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null default 'spare' check (kind in ('spare', 'class')),
  title text not null check (char_length(title) between 3 and 120),
  style text,
  studio text,
  teacher text,
  location text,
  starts_at timestamptz not null,
  price_pence integer check (price_pence is null or price_pence between 0 and 100000),
  spaces integer not null default 1 check (spaces between 1 and 200),
  link text check (link is null or link ~* '^https://'),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'taken', 'removed')),
  created_at timestamptz not null default now()
);
create index if not exists class_spaces_open_idx on public.class_spaces (starts_at) where status = 'open';
alter table public.class_spaces enable row level security;

create policy class_spaces_read on public.class_spaces for select to authenticated
  using (status = 'open' or created_by = auth.uid() or public.is_admin());
create policy class_spaces_insert on public.class_spaces for insert to authenticated
  with check (created_by = auth.uid() and public.is_email_verified() and not public.is_suspended(auth.uid()) and starts_at > now() - interval '1 hour');
create policy class_spaces_update on public.class_spaces for update to authenticated
  using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy class_spaces_delete on public.class_spaces for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
grant select, insert, update, delete on public.class_spaces to authenticated;
