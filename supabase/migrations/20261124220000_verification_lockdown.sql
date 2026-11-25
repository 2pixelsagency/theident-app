-- Members can never set their own verification flags (only the server / admins / triggers can),
-- and the confirm token on verification checks is never readable from the app.
create or replace function public.protect_verification_flags() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.pro_verified := false; new.pro_verified_via := null; new.graduate_verified := false;
    else
      new.pro_verified := old.pro_verified; new.pro_verified_via := old.pro_verified_via; new.graduate_verified := old.graduate_verified;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_verification_flags on public.profiles;
create trigger trg_protect_verification_flags before insert or update on public.profiles
  for each row execute function public.protect_verification_flags();

-- Supabase grants new tables to anon/authenticated by default: take those back, then grant only what's needed
revoke all on public.verification_checks from anon, authenticated;
grant select (id, profile_id, kind, method, status, email, link, evidence_path, note, created_at, decided_at) on public.verification_checks to authenticated;
revoke all on public.profile_access from anon, authenticated;
grant select on public.profile_access to anon, authenticated;
grant insert, update, delete on public.profile_access to authenticated;
revoke all on public.profile_views from anon, authenticated;
grant insert on public.profile_views to anon, authenticated;
grant select on public.profile_views to authenticated;
