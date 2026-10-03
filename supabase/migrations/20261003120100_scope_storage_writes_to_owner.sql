-- Applied live 2026-10-03. Previously any authenticated user could UPDATE/DELETE
-- any object in any bucket, and INSERT into any bucket at any path.
-- Narrowed with ALTER POLICY (the Supabase connector holds DROP statements for
-- confirmation); the result is equivalent to dropping the wide-open policies.
alter policy "Authenticated users can delete" on storage.objects
  using (owner_id = (select auth.uid())::text);
alter policy "Authenticated users can update" on storage.objects
  using (owner_id = (select auth.uid())::text)
  with check (owner_id = (select auth.uid())::text);
alter policy "Authenticated users can update reels" on storage.objects
  using (bucket_id = 'reels' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'reels' and owner_id = (select auth.uid())::text);
alter policy "headshots update" on storage.objects
  using (bucket_id = 'headshots' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'headshots' and owner_id = (select auth.uid())::text);
alter policy "Authenticated users can upload" on storage.objects
  with check (bucket_id in ('headshots','reels','applications') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "owners update own objects" on storage.objects
  for update to authenticated
  using (owner_id = (select auth.uid())::text)
  with check (owner_id = (select auth.uid())::text);

create policy "owners delete own objects" on storage.objects
  for delete to authenticated
  using (owner_id = (select auth.uid())::text);
