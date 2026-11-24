-- Skills from a performer's CV that aren't in the list yet: members can add one (deduplicated, case-insensitive),
-- filed under a category. Also a vocal range field on profiles (public, like height).
alter table public.skills add column if not exists added_by uuid references auth.users(id) on delete set null;

create or replace function public.add_skill(p_name text, p_category_id int)
returns int language plpgsql security definer set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  found int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(n) < 2 or char_length(n) > 60 then raise exception 'skill name must be 2–60 characters'; end if;
  select id into found from skills where lower(name) = lower(n) limit 1;
  if found is not null then return found; end if;
  -- a member can add at most 30 new skills a day
  if (select count(*) from skills where added_by = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many new skills today';
  end if;
  insert into skills (name, category_id, added_by)
  values (n, (select id from skills_categories where id = p_category_id), auth.uid())
  returning id into found;
  return found;
end $$;
revoke all on function public.add_skill(text, int) from public, anon;
grant execute on function public.add_skill(text, int) to authenticated;

alter table public.profiles add column if not exists vocal_range text check (vocal_range is null or char_length(vocal_range) <= 60);
grant select (vocal_range) on public.profiles to anon, authenticated;
grant insert (vocal_range), update (vocal_range) on public.profiles to authenticated;
