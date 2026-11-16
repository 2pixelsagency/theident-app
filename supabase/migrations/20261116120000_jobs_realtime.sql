-- Live "What's happening" / Latest jobs on Home: stream job changes (RLS still limits rows to published or own)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'jobs') then
    alter publication supabase_realtime add table public.jobs;
  end if;
end $$;
