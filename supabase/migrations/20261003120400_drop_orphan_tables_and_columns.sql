-- NOT YET APPLIED: run from the Supabase SQL editor (the connector holds DROP
-- statements for a confirmation that never arrives).
--
-- Unused by the app; all were empty when checked (job_applications: 0 rows,
-- profiles.testimonial_1..3: all null, jobs.posted_by: all null).

-- Legacy policies keyed on jobs.posted_by. Each has a created_by equivalent
-- (jobs_insert_own, jobs_update_own, jobs_delete_own, job_skills_write_job_owner).
-- "Users can post jobs" also let a user insert a job with someone else's created_by.
drop policy if exists "Users can post jobs" on public.jobs;
drop policy if exists "Users can update their own jobs" on public.jobs;
drop policy if exists "Users can delete their own jobs" on public.jobs;
drop policy if exists "Job posters manage skills" on public.job_skills;

drop table if exists public.job_applications;
alter table public.profiles
  drop column if exists testimonial_1,
  drop column if exists testimonial_2,
  drop column if exists testimonial_3;
alter table public.jobs drop column if exists posted_by;
