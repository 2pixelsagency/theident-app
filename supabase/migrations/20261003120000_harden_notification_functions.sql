-- Applied live on 2026-10-03 via Supabase MCP from the design chat.
-- Commit so the repo matches the database.
-- Harden the SECURITY DEFINER notification/trigger functions.

alter function public.notify_on_application() set search_path = public, pg_temp;
alter function public.notify_on_connection() set search_path = public, pg_temp;
alter function public.on_message_insert() set search_path = public, pg_temp;
alter function public.push_notify_devices() set search_path = public, pg_temp;
alter function public.notify_job_matches() set search_path = public, pg_temp;

revoke execute on function
  public.notify_on_application(),
  public.notify_on_connection(),
  public.on_message_insert(),
  public.push_notify_devices(),
  public.notify_job_matches()
from public, anon, authenticated;

grant execute on function
  public.notify_on_application(),
  public.notify_on_connection(),
  public.on_message_insert(),
  public.push_notify_devices(),
  public.notify_job_matches()
to service_role;
