-- Delete the whole App Store demo scenario (robots + everything they made).
begin;
delete from public.cast_chats where created_by in (select id from public.profiles where is_demo);
delete from public.jobs where is_demo;
-- auth users cascade to profiles → applications, reels, credits, chats, messages, notes, todos…
delete from auth.users where email like '%@demo.theident.me';
commit;
