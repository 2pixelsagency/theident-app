-- Jobs shared by The Ident from elsewhere (e.g. a casting director's Instagram), credited and linked back,
-- plus "Is this your casting? Claim it" so the real poster can take the listing over.
alter table public.jobs add column if not exists source_url text;
alter table public.jobs add column if not exists source_handle text;
alter table public.jobs add column if not exists shared_by_ident boolean not null default false;

create table if not exists public.job_claims (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  note text check (length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (job_id, profile_id)
);
alter table public.job_claims enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'job_claims' and policyname = 'job_claims_insert_own') then
    create policy "job_claims_insert_own" on public.job_claims for insert to authenticated
      with check (profile_id = (select auth.uid()) and exists (select 1 from jobs j where j.id = job_id and j.shared_by_ident));
    create policy "job_claims_read_own_or_admin" on public.job_claims for select to authenticated using (profile_id = (select auth.uid()) or public.is_admin());
    create policy "job_claims_admin_update" on public.job_claims for update to authenticated using (public.is_admin());
  end if;
end $$;
grant select, insert, update on public.job_claims to authenticated;

-- Admin approves a claim: the claimant becomes the poster and the listing is no longer "shared"
create or replace function public.approve_job_claim(claim uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c job_claims;
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  select * into c from job_claims where id = claim;
  update jobs set created_by = c.profile_id, shared_by_ident = false where id = c.job_id;
  update job_claims set status = case when id = claim then 'approved' else 'rejected' end where job_id = c.job_id and status = 'pending';
  insert into notifications (profile_id, type, title, body, data)
  values (c.profile_id, 'system', 'Your listing is yours', 'You can now edit it and review applicants in Your postings.', jsonb_build_object('url', '/postings/' || c.job_id::text));
end $$;
revoke execute on function public.approve_job_claim(uuid) from public, anon;
grant execute on function public.approve_job_claim(uuid) to authenticated;
