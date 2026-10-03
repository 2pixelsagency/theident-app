-- Unused by the app; all were empty when checked (job_applications: 0 rows,
-- profiles.testimonial_1..3: all null, jobs.posted_by: all null).
drop table if exists public.job_applications;
alter table public.profiles
  drop column if exists testimonial_1,
  drop column if exists testimonial_2,
  drop column if exists testimonial_3;
alter table public.jobs drop column if exists posted_by;
