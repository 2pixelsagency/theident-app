-- Welcome email is sent once per member (server-side only; not readable by clients — no column grant)
alter table public.profiles add column if not exists welcome_sent_at timestamptz;
-- Existing members have already had their first email
update public.profiles set welcome_sent_at = coalesce(created_at, now()) where welcome_sent_at is null;
