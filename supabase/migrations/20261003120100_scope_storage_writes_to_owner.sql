-- Safe to apply any time (backward compatible with current code).
-- Previously any authenticated user could UPDATE/DELETE any object in any bucket,
-- and INSERT into any bucket. Scope update/delete to the uploader; keep the
-- per-bucket insert policies (headshots, reels, applications).
drop policy if exists "Authenticated users can delete" on storage.objects;
drop policy if exists "Authenticated users can update" on storage.objects;
drop policy if exists "Authenticated users can update reels" on storage.objects;
drop policy if exists "headshots update" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;

create policy "owners update own objects" on storage.objects
  for update to authenticated
  using (owner_id = (select auth.uid())::text)
  with check (owner_id = (select auth.uid())::text);

create policy "owners delete own objects" on storage.objects
  for delete to authenticated
  using (owner_id = (select auth.uid())::text);
