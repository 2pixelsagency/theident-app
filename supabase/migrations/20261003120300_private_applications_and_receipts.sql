-- Applied live 2026-10-03 (ahead of the deploy). The new code signs URLs and
-- uploads receipts to the `receipts` bucket.

-- applications: CVs, attachments and NDA signatures. Path = <applicant_id>/<job_id>/<file>
update storage.buckets set public = false where id = 'applications';

alter policy "Auth users can upload application files" on storage.objects
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "applicant or job poster can read application files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'applications' and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.jobs j
        where j.id::text = (storage.foldername(name))[2]
          and j.created_by = (select auth.uid())
      )
    )
  );

-- receipts: expense receipts, previously stored in the public headshots bucket. Path = <user_id>/<file>
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

create policy "users upload own receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users read own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
