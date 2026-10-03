-- Applied live 2026-10-04. Profile banner image and per-user notification preferences.
alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists notification_prefs jsonb not null default '{"matches": true, "applications": true, "messages": true, "marketing": false}'::jsonb;
