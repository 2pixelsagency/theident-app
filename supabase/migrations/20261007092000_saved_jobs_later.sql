-- Find → swipe a job card right to Save (shortlist) or left to "Later" (a draft pile
-- hidden from the main feed until you come back to it). Existing rows stay 'saved'.
alter table public.saved_jobs add column if not exists list text not null default 'saved';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'saved_jobs_list_check') then
    alter table public.saved_jobs add constraint saved_jobs_list_check check (list in ('saved', 'later'));
  end if;
end $$;
