-- Accounts set up by The Ident for members (with their permission) before they've logged in with their own email.
-- Kept out of search engines (noindex + not in sitemap) until claimed.
alter table public.profiles add column if not exists placeholder_account boolean not null default false;
grant select (placeholder_account) on public.profiles to anon, authenticated;
