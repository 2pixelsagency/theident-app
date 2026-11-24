-- Connection notifications: the request opens the requester's profile (where Accept is), and the
-- requester hears back when it's accepted.
create or replace function public.notify_on_connection() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') into who from profiles where id = new.requester_id;
  insert into notifications (profile_id, title, body, type, data)
  values (new.receiver_id, 'Connection request', coalesce(who, 'Someone') || ' wants to connect with you',
          'connection', jsonb_build_object('requester_id', new.requester_id::text, 'url', '/talent/' || new.requester_id));
  return new;
end $$;

create or replace function public.notify_on_connection_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') into who from profiles where id = new.receiver_id;
    insert into notifications (profile_id, title, body, type, data)
    values (new.requester_id, 'You’re connected', coalesce(who, 'Your connection') || ' accepted your request — you can message each other now',
            'connection', jsonb_build_object('profile_id', new.receiver_id::text, 'url', '/talent/' || new.receiver_id));
  end if;
  return new;
end $$;
drop trigger if exists on_connection_accepted on public.connections;
create trigger on_connection_accepted after update of status on public.connections
  for each row execute function public.notify_on_connection_accepted();

-- Old requests pointed at a page that doesn't exist
update public.notifications set data = jsonb_set(data, '{url}', to_jsonb('/talent/' || (data->>'requester_id')))
  where type = 'connection' and data->>'url' = '/connections' and data ? 'requester_id';
