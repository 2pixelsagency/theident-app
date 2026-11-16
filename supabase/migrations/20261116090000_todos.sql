-- Performer to-do list: personal tasks (the automatic ones are computed in the app from applications, saved roles, invoices…)
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (length(title) between 1 and 200),
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists todos_profile_idx on public.todos (profile_id, done_at, due_on);
alter table public.todos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'todos' and policyname = 'todos_own') then
    create policy "todos_own" on public.todos for all to authenticated
      using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
  end if;
end $$;
grant select, insert, update, delete on public.todos to authenticated;
