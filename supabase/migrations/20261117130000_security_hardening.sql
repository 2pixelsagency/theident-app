-- Security advisor tidy-ups:
-- trigger-only functions must not be callable over the API; fixed search_path on helper functions
revoke execute on function public.digs_guard() from public, anon, authenticated;
revoke execute on function public.notify_digs_enquiry() from public, anon, authenticated;
revoke execute on function public.protect_boost() from public, anon, authenticated;
alter function public.protect_boost() set search_path = public;
alter function public.notification_pref_key(text, jsonb) set search_path = public;
alter function public.flag_categories(text) set search_path = public;
