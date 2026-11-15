-- Reel cover frame + length (set by the in-app trimmer). Additive.
alter table public.reels add column if not exists poster_url text;
alter table public.reels add column if not exists duration_s numeric;
