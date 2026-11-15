-- Part 2 — APPLY ONLY AFTER the profile-editing PR is deployed (older code reads profiles with select *).
-- Agent email/phone and date of birth stop being readable through the API; the owner (or anyone, if
-- the owner turns on "Show agent contact") reads the agent contact via public.profile_contact().
-- NOTE: SELECT on profiles is now granted per column — add any new profiles column to this list.

revoke select on public.profiles from anon, authenticated;
grant select (
  id, first_name, last_name, slug, location, bio, what_i_do, picture_url, height, age, minimum_age, maximum_age,
  available, featured, show_talent, gender_id, ethnicity_id, hair_colour_id, eye_colour_id, vid_1, vid_2, vid_3, vid_4,
  gallery, created_at, updated_at, email_alerts_enabled, last_match_email_at, availability_status, available_from,
  production_until, agent_name, last_active, summary, email_verified, account_role, company_name, is_graduate,
  graduate_school, graduate_year, is_verified, banner_url, notification_prefs, cv_path, show_agent_contact
) on public.profiles to anon, authenticated;

