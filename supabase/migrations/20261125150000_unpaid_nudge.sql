-- "Have you forgotten about us?" — one reminder for accounts that never started a membership.
-- Written only by the server (service role); members can't read-modify it via the per-column grants.
alter table public.profiles add column if not exists nudge_sent_at timestamptz;
