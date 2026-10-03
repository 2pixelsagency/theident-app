-- Applied live 2026-10-04. Pay & earnings log (owner-only), with the tax
-- set-aside recorded on each payment.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  payer text,
  description text,
  paid_on date not null default current_date,
  job_id uuid references public.jobs(id) on delete set null,
  set_aside numeric(10,2) not null default 0 check (set_aside >= 0),
  created_at timestamptz not null default now()
);
create index if not exists payments_profile_idx on public.payments (profile_id, paid_on desc);

alter table public.payments enable row level security;
create policy "payments_own" on public.payments for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
grant select, insert, update, delete on public.payments to authenticated;
