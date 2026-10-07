-- Kabina v3.3: richer historical parsing from 2015.
-- Safe to run repeatedly.

alter table public.psmf_season_details
  add column if not exists details_html text;

notify pgrst, 'reload schema';
