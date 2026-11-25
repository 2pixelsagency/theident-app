-- Cast chats: polls, events with RSVPs, and a chat photo.
alter table public.cast_chats add column if not exists photo_url text;

-- A message can be plain text, a poll or an event. meta holds the details:
--   poll:  { "question": "...", "options": ["...", "..."] }
--   event: { "title": "...", "date": "2026-12-16", "time": "19:30", "location": "...", "details": "..." }
alter table public.cast_chat_messages
  add column if not exists kind text not null default 'text' check (kind in ('text', 'poll', 'event')),
  add column if not exists meta jsonb;

create table if not exists public.cast_chat_votes (
  message_id uuid not null references public.cast_chat_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  option smallint not null check (option between 0 and 11),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
create table if not exists public.cast_chat_rsvps (
  message_id uuid not null references public.cast_chat_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('going', 'maybe', 'no')),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

-- Members of the chat can see everyone's votes / RSVPs, and manage their own
create or replace function public.cast_message_chat(mid uuid) returns uuid
language sql stable security definer set search_path = public as $$ select chat_id from cast_chat_messages where id = mid $$;

alter table public.cast_chat_votes enable row level security;
create policy "members read votes" on public.cast_chat_votes for select to authenticated using (public.is_cast_chat_member(public.cast_message_chat(message_id)));
create policy "members vote for themselves" on public.cast_chat_votes for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()) and public.is_cast_chat_member(public.cast_message_chat(message_id)));
alter table public.cast_chat_rsvps enable row level security;
create policy "members read rsvps" on public.cast_chat_rsvps for select to authenticated using (public.is_cast_chat_member(public.cast_message_chat(message_id)));
create policy "members rsvp for themselves" on public.cast_chat_rsvps for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()) and public.is_cast_chat_member(public.cast_message_chat(message_id)));

revoke all on public.cast_chat_votes, public.cast_chat_rsvps from anon, authenticated;
grant select, insert, update, delete on public.cast_chat_votes, public.cast_chat_rsvps to authenticated;
