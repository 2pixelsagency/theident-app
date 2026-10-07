-- Invoices (Pay & earnings → Invoices). Built and turned into a PDF in the app;
-- /api/invoices/send emails the PDF to the client. Owner-only via RLS.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  client_name text not null default '',
  client_email text,
  client_address text,
  from_details text,
  items jsonb not null default '[]'::jsonb,
  vat_rate numeric(5,2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, number)
);

create index if not exists invoices_profile_idx on public.invoices (profile_id, created_at desc);

alter table public.invoices enable row level security;
grant select, insert, update, delete on public.invoices to authenticated;

create policy "owners read invoices" on public.invoices
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "owners create invoices" on public.invoices
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "owners update invoices" on public.invoices
  for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "owners delete invoices" on public.invoices
  for delete to authenticated using (profile_id = (select auth.uid()));

create or replace function public.invoices_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger invoices_touch before update on public.invoices
  for each row execute function public.invoices_touch();
