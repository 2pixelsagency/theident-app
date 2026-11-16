-- Brief 04: casting's private rating + note on each applicant. Separate table so the applicant
-- (who can read their own application row) never sees it. Only the job's poster can read/write.
create table if not exists public.applicant_notes (
  application_id uuid primary key references public.applications(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  note text check (length(note) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.applicant_notes enable row level security;

create or replace function public.is_application_poster(app uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from applications a join jobs j on j.id = a.job_id where a.id = app and j.created_by = auth.uid())
$$;
revoke execute on function public.is_application_poster(uuid) from public, anon;
grant execute on function public.is_application_poster(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'applicant_notes' and policyname = 'applicant_notes_poster') then
    create policy "applicant_notes_poster" on public.applicant_notes for all to authenticated
      using (public.is_application_poster(application_id)) with check (public.is_application_poster(application_id));
  end if;
end $$;
grant select, insert, update, delete on public.applicant_notes to authenticated;
