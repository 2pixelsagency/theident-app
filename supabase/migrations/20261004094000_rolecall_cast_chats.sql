-- Applied live 2026-10-04. Group cast chats (production-linked) with channels,
-- members-only RLS via security-definer helpers, realtime, and notifications.
-- Also points 1:1 message notifications at the new /chats screen.
create table if not exists public.cast_chats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  production_job_id uuid references public.jobs(id) on delete set null,
  production_name text,
  channels text[] not null default array['company','swings','social']::text[],
  created_by uuid not null references public.profiles(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cast_chat_members (
  chat_id uuid not null references public.cast_chats(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  title text,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (chat_id, profile_id)
);

create table if not exists public.cast_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.cast_chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'company',
  body text not null check (length(body) between 1 and 4000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cast_chat_members_profile_idx on public.cast_chat_members (profile_id);
create index if not exists cast_chat_messages_chat_idx on public.cast_chat_messages (chat_id, created_at);

create or replace function public.is_cast_chat_member(cid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from cast_chat_members where chat_id = cid and profile_id = auth.uid())
$$;
create or replace function public.is_cast_chat_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from cast_chat_members where chat_id = cid and profile_id = auth.uid() and role = 'admin')
$$;
revoke execute on function public.is_cast_chat_member(uuid), public.is_cast_chat_admin(uuid) from public, anon;
grant execute on function public.is_cast_chat_member(uuid), public.is_cast_chat_admin(uuid) to authenticated;

alter table public.cast_chats enable row level security;
alter table public.cast_chat_members enable row level security;
alter table public.cast_chat_messages enable row level security;

create policy "cast_chats_select_member" on public.cast_chats for select to authenticated
  using (created_by = (select auth.uid()) or public.is_cast_chat_member(id));
create policy "cast_chats_insert_own" on public.cast_chats for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "cast_chats_update_admin" on public.cast_chats for update to authenticated
  using (public.is_cast_chat_admin(id));
create policy "cast_chats_delete_creator" on public.cast_chats for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "cast_chat_members_select_member" on public.cast_chat_members for select to authenticated
  using (public.is_cast_chat_member(chat_id));
create policy "cast_chat_members_insert_admin" on public.cast_chat_members for insert to authenticated
  with check (public.is_cast_chat_admin(chat_id)
    or exists (select 1 from cast_chats c where c.id = chat_id and c.created_by = (select auth.uid())));
create policy "cast_chat_members_update_self_or_admin" on public.cast_chat_members for update to authenticated
  using (profile_id = (select auth.uid()) or public.is_cast_chat_admin(chat_id));
create policy "cast_chat_members_delete_self_or_admin" on public.cast_chat_members for delete to authenticated
  using (profile_id = (select auth.uid()) or public.is_cast_chat_admin(chat_id));

create policy "cast_chat_messages_select_member" on public.cast_chat_messages for select to authenticated
  using (public.is_cast_chat_member(chat_id));
create policy "cast_chat_messages_insert_member" on public.cast_chat_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_cast_chat_member(chat_id));
create policy "cast_chat_messages_update_admin" on public.cast_chat_messages for update to authenticated
  using (public.is_cast_chat_admin(chat_id));
create policy "cast_chat_messages_delete_own_or_admin" on public.cast_chat_messages for delete to authenticated
  using (sender_id = (select auth.uid()) or public.is_cast_chat_admin(chat_id));

grant select, insert, update, delete on public.cast_chats, public.cast_chat_members, public.cast_chat_messages to authenticated;

create or replace function public.on_cast_message_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare c record; s record;
begin
  update cast_chats set last_message = NEW.body, last_message_at = NEW.created_at where id = NEW.chat_id returning * into c;
  select first_name into s from profiles where id = NEW.sender_id;
  insert into notifications (profile_id, type, title, body, data)
  select m.profile_id, 'message', c.name,
         coalesce(s.first_name, 'Someone') || ': ' || case when length(NEW.body) > 40 then left(NEW.body, 40) || '…' else NEW.body end,
         jsonb_build_object('cast_chat_id', NEW.chat_id::text, 'url', '/chats/cast/' || NEW.chat_id::text)
  from cast_chat_members m where m.chat_id = NEW.chat_id and m.profile_id <> NEW.sender_id;
  return NEW;
end $$;
revoke execute on function public.on_cast_message_insert() from public, anon, authenticated;

create trigger trg_cast_message_insert after insert on public.cast_chat_messages
  for each row execute function public.on_cast_message_insert();

alter publication supabase_realtime add table public.cast_chat_messages;

create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  convo record;
  recipient uuid;
  sender_record record;
begin
  select * into convo from conversations where id = NEW.conversation_id;
  recipient := case when convo.user_a = NEW.sender_id then convo.user_b else convo.user_a end;
  select * into sender_record from profiles where id = NEW.sender_id;

  update conversations
    set last_message = NEW.body, last_message_at = NEW.created_at
    where id = NEW.conversation_id;

  insert into notifications (profile_id, title, body, type, data)
  values (
    recipient, 'New message',
    coalesce(sender_record.first_name, 'Someone') || ': ' ||
      (case when length(NEW.body) > 40 then left(NEW.body, 40) || '…' else NEW.body end),
    'message',
    jsonb_build_object('conversation_id', NEW.conversation_id::text, 'url', '/chats/' || NEW.conversation_id::text)
  );
  return NEW;
end $$;
