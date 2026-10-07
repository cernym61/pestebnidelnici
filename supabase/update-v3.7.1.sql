-- Kabina v3.7.1: oprava chybných souřadnic mapy.
-- Safe to re-run.

update public.venues
set latitude=null, longitude=null
where latitude is null
   or longitude is null
   or (abs(coalesce(latitude,0)) < 0.0001 and abs(coalesce(longitude,0)) < 0.0001)
   or latitude < 48 or latitude > 51.5
   or longitude < 12 or longitude > 19;

notify pgrst, 'reload schema';
