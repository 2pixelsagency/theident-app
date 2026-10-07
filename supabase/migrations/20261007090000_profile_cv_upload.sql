-- Uploaded CV on a profile (Download CV). Path = <user_id>/<file> in the private `cvs` bucket.
-- Owners manage their own folder; any signed-in member can read (casting teams download CVs).
-- Anonymous visitors only get the generated PDF.

alter table public.profiles add column if not exists cv_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own cv" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users update own cv" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own cv" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "members read cvs" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs');
