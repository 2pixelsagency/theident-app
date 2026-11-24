-- Uploaded CV files are private to their owner (casting downloads the generated CV instead)
drop policy if exists "members read cvs" on storage.objects;
create policy "users read own cv" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
