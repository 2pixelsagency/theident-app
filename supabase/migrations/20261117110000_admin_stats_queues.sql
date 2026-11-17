-- Admin sidebar badges: queues waiting on an admin (digs to approve, listing claims)
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  return jsonb_build_object(
    'members', (select count(*) from profiles where not is_demo),
    'performers', (select count(*) from profiles where not is_demo and coalesce(account_role, 'performer') <> 'caster'),
    'casting', (select count(*) from profiles where not is_demo and account_role = 'caster'),
    'new_7d', (select count(*) from profiles where not is_demo and created_at > now() - interval '7 days'),
    'live_jobs', (select count(*) from jobs where is_published and not is_demo and (application_deadline is null or application_deadline >= current_date)),
    'applications_7d', (select count(*) from applications a join jobs j on j.id = a.job_id where not j.is_demo and a.created_at > now() - interval '7 days'),
    'messages_7d', (select count(*) from messages where created_at > now() - interval '7 days') + (select count(*) from cast_chat_messages where created_at > now() - interval '7 days'),
    'open_flags', (select count(*) from moderation_flags where status = 'open'),
    'high_flags', (select count(*) from moderation_flags where status = 'open' and severity = 'high'),
    'open_reports', (select count(*) from reports where status = 'open'),
    'suspended', (select count(*) from suspensions where until is null or until > now()),
    'demo_accounts', (select count(*) from profiles where is_demo),
    'digs_pending', (select count(*) from digs where review_status = 'pending'),
    'claims_pending', (select count(*) from job_claims where status = 'pending'),
    'boosted', (select count(*) from profiles where boosted_until > now()),
    'shared_jobs', (select count(*) from jobs where shared_by_ident and is_published)
  );
end $$;
