-- Applied live 2026-10-04. Castings pipeline details, contracts, job end date, Blocks.
-- Status flow keeps the existing check: submitted → audition (self-tape) →
-- callback (recall) → offer (pencilled) → booked; `outcome` closes it without booking.
alter table public.applications
  add column if not exists outcome text,
  add column if not exists due_at timestamptz,
  add column if not exists held_from date,
  add column if not exists held_to date,
  add column if not exists next_step_note text,
  add column if not exists contract_terms text,
  add column if not exists contract_signed_at timestamptz,
  add column if not exists contract_signature text,
  add column if not exists updated_at timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'applications_outcome_check') then
    alter table public.applications add constraint applications_outcome_check check (outcome is null or outcome in ('declined','withdrawn'));
  end if;
end $$;

alter table public.jobs add column if not exists end_date date;

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null,
  start_date date not null default current_date,
  weeks integer not null default 12 check (weeks between 1 and 52),
  actions jsonb not null default '[]'::jsonb,
  why text,
  weekly_checkin boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.block_checks (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week_index integer not null,
  action_index integer not null,
  created_at timestamptz not null default now(),
  unique (block_id, week_index, action_index)
);

create index if not exists blocks_profile_idx on public.blocks (profile_id, is_active);
create index if not exists block_checks_block_idx on public.block_checks (block_id);

alter table public.blocks enable row level security;
alter table public.block_checks enable row level security;

create policy "blocks_own" on public.blocks for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "block_checks_own" on public.block_checks for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select, insert, update, delete on public.blocks, public.block_checks to authenticated;
