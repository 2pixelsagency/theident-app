-- Community chats everyone is in: "Features we want" and "Bug fixes". New members join them automatically.
alter table public.cast_chats add column if not exists is_community boolean not null default false;

do $$
declare owner uuid := (select p.id from profiles p join auth.users u on u.id = p.id where lower(u.email) = 'solomon.adlam98@gmail.com' limit 1);
declare c uuid;
declare nm text;
begin
  foreach nm in array array['Features we want', 'Bug fixes'] loop
    select id into c from cast_chats where is_community and name = nm limit 1;
    if c is null then
      insert into cast_chats (name, created_by, production_name, channels, is_community)
      values (nm, owner, 'The Ident community', array['general'], true) returning id into c;
    end if;
    -- every real member (not placeholder or demo accounts); admins run the chat
    insert into cast_chat_members (chat_id, profile_id, role)
    select c, p.id, case when p.id = owner or lower(u.email) in (select email from admin_emails) then 'admin' else 'member' end
    from profiles p join auth.users u on u.id = p.id
    where not coalesce(p.placeholder_account, false) and not coalesce(p.is_demo, false)
    on conflict do nothing;
  end loop;
end $$;

-- New members are added to every community chat
create or replace function public.join_community_chats() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(new.placeholder_account, false) and not coalesce(new.is_demo, false) then
    insert into cast_chat_members (chat_id, profile_id, role)
    select id, new.id, 'member' from cast_chats where is_community
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_join_community_chats on public.profiles;
create trigger trg_join_community_chats after insert on public.profiles for each row execute function public.join_community_chats();
