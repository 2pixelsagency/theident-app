-- Auth brief 01 — email verification soft gate.
-- Supabase "Confirm email" is off (accounts work immediately); the app verifies email itself
-- (Resend link → /verify → profiles.email_verified). Unverified members can browse but not
-- apply or post. Enforced here as well as in the UI.

-- 1) Members can't mark themselves verified: lock email_verified (and is_verified) for the
--    anon/authenticated roles on update, and force both false on a client-side insert.
create or replace function public.protect_profile_verified()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_verified := false;
      new.email_verified := false;
    else
      if new.is_verified is distinct from old.is_verified then new.is_verified := old.is_verified; end if;
      if new.email_verified is distinct from old.email_verified then new.email_verified := old.email_verified; end if;
    end if;
  end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_protect_profile_verified_insert') then
    create trigger trg_protect_profile_verified_insert before insert on public.profiles
      for each row execute function public.protect_profile_verified();
  end if;
end $$;

-- 2) Helper used by the insert policies below
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce((select email_verified from public.profiles where id = (select auth.uid())), false)
$$;
revoke all on function public.is_email_verified() from public, anon;
grant execute on function public.is_email_verified() to authenticated;

-- 3) Applying and posting need a verified email (both overlapping self-insert policies on each table)
alter policy "Users can submit applications" on public.applications
  with check (profile_id = (select auth.uid()) and public.is_email_verified());
alter policy "applications_insert_self" on public.applications
  with check (profile_id = (select auth.uid()) and public.is_email_verified());
alter policy "Users can insert their own jobs" on public.jobs
  with check ((select auth.uid()) = created_by and public.is_email_verified());
alter policy "jobs_insert_own" on public.jobs
  with check (created_by = (select auth.uid()) and public.is_email_verified());
