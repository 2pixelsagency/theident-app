-- NOT YET APPLIED: needs running from the Supabase SQL editor (the connector
-- holds DROP statements for a confirmation that never arrives).
-- Safe to apply any time. pg_net is not relocatable, so drop and recreate it in
-- the extensions schema. Its functions and tables live in the `net` schema, so
-- push_notify_devices (net.http_post) keeps working. Drops any queued requests
-- (the queue was empty when checked).
drop extension if exists pg_net;
create extension pg_net schema extensions;
