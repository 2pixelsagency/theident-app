-- Verification: "Verified professional" and "Verified graduate" (which unlocks the graduate price).
-- The flags on profiles are set only by the server (API routes / admin / triggers) — clients can read, never write.
alter table public.profiles
  add column if not exists pro_verified boolean not null default false,
  add column if not exists pro_verified_via text,
  add column if not exists graduate_verified boolean not null default false;
grant select (pro_verified, pro_verified_via, graduate_verified) on public.profiles to anon, authenticated;

create table if not exists public.verification_checks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('graduate', 'professional')),
  method text not null check (method in ('school_email', 'agent', 'link', 'evidence')),
  status text not null default 'pending' check (status in ('awaiting_email', 'pending', 'approved', 'rejected')),
  email text, link text, evidence_path text, note text,
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  decided_at timestamptz, decided_by uuid references auth.users(id) on delete set null
);
create index if not exists verification_checks_profile on public.verification_checks (profile_id, created_at desc);
create index if not exists verification_checks_pending on public.verification_checks (status) where status = 'pending';
alter table public.verification_checks enable row level security;
-- Owners see their own checks (never the token); admins see all. Writes happen server-side only.
create policy "owner reads own checks" on public.verification_checks for select to authenticated using (profile_id = (select auth.uid()));
create policy "admins read checks" on public.verification_checks for select to authenticated using (public.is_admin());
grant select (id, profile_id, kind, method, status, email, link, evidence_path, note, created_at, decided_at) on public.verification_checks to authenticated;

-- Admin decision (approve / reject) from the admin dashboard
create or replace function public.admin_decide_check(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c verification_checks;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update verification_checks set status = case when p_approve then 'approved' else 'rejected' end,
    note = coalesce(p_note, note), decided_at = now(), decided_by = auth.uid()
  where id = p_id returning * into c;
  if c.id is null then raise exception 'not found'; end if;
  if p_approve then
    if c.kind = 'graduate' then update profiles set graduate_verified = true where id = c.profile_id;
    else update profiles set pro_verified = true, pro_verified_via = coalesce(pro_verified_via,
      case c.method when 'agent' then 'Agent confirmed' when 'link' then 'Professional profile checked' else 'Checked by The Ident' end) where id = c.profile_id;
    end if;
  end if;
end $$;
revoke all on function public.admin_decide_check(uuid, boolean, text) from public, anon;
grant execute on function public.admin_decide_check(uuid, boolean, text) to authenticated;

-- Booked through The Ident → verified professional automatically
create or replace function public.verify_on_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'booked' and old.status is distinct from 'booked' then
    update profiles set pro_verified = true, pro_verified_via = coalesce(pro_verified_via, 'Booked through The Ident') where id = new.profile_id and not pro_verified;
  end if;
  return new;
end $$;
drop trigger if exists trg_verify_on_booking on public.applications;
create trigger trg_verify_on_booking after update of status on public.applications for each row execute function public.verify_on_booking();

-- Proof uploads (certificate, letter, student card): private bucket, owner uploads to their folder, admins read
insert into storage.buckets (id, name, public) values ('verification', 'verification', false) on conflict (id) do nothing;
create policy "owner uploads verification proof" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner or admin reads verification proof" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
