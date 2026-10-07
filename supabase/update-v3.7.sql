-- Kabina v3.7: souřadnice hřišť pro interaktivní mapu.
-- Run once in Supabase SQL Editor. Safe to re-run.

alter table public.venues add column if not exists latitude double precision;
alter table public.venues add column if not exists longitude double precision;

notify pgrst, 'reload schema';
