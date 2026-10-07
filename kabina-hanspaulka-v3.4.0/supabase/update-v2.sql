-- Kabina v2: run this once in Supabase SQL Editor (Database), after schema.sql.
-- It is safe to re-run.

-- Team members can see the attendance board after signing in.
drop policy if exists "own attendance readable" on public.attendance;
drop policy if exists "attendance readable by signed in" on public.attendance;
create policy "attendance readable by signed in" on public.attendance
for select to authenticated
using (true);

-- Allow authenticated users to read player names / profiles.
drop policy if exists "players readable by signed in" on public.players;
create policy "players readable by signed in" on public.players
for select to authenticated
using (true);

-- Claim exactly one unclaimed player profile from the application.
create or replace function public.claim_player(player_name text)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.players;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.players where user_id = auth.uid()) then
    select * into claimed from public.players where user_id = auth.uid();
    return claimed;
  end if;

  update public.players
     set user_id = auth.uid()
   where display_name = player_name
     and user_id is null
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Player is already linked or does not exist';
  end if;

  return claimed;
end;
$$;

grant execute on function public.claim_player(text) to authenticated;

-- Seed current squad. Existing rows are preserved.
insert into public.players (display_name, psmf_name)
values
  ('Černý Martin','Černý Martin'),
  ('Horák Adam','Horák Adam'),
  ('Jelenčiak Jakub','Jelenčiak Jakub'),
  ('Kolář Adam','Kolář Adam'),
  ('Kubala Martin','Kubala Martin'),
  ('Landfeld Jan','Landfeld Jan'),
  ('Landfeld Vít','Landfeld Vít'),
  ('Sigmund Radek','Sigmund Radek'),
  ('Varner Howard','Varner Howard'),
  ('Veselý Mikuláš','Veselý Mikuláš')
on conflict (display_name) do nothing;

-- Seed current fixtures. psmf_key is stable and used by the web app.
insert into public.matches (psmf_key, kickoff, venue_code, home_team, away_team, home_score, away_score, season)
values
  ('2026-podzim-r1','2026-09-02 20:45:00+02','P1','Pěstební dělníci A','Masáže FC',2,2,'2026-podzim'),
  ('2026-podzim-r2','2026-09-16 20:30:00+02','PODV1','Penál AFK','Pěstební dělníci A',2,0,'2026-podzim'),
  ('2026-podzim-r3','2026-09-23 19:30:00+02','DEKAN','Pěstební dělníci A','Santovi Sobi',1,8,'2026-podzim'),
  ('2026-podzim-r4','2026-10-07 20:45:00+02','BECH','Princ Praha FC','Pěstební dělníci A',null,null,'2026-podzim'),
  ('2026-podzim-r5','2026-10-14 20:45:00+02','HOSTI','Pěstební dělníci A','Batalion 91 A',null,null,'2026-podzim'),
  ('2026-podzim-r6','2026-10-21 19:15:00+02','PODV2','Credit Praha FC','Pěstební dělníci A',null,null,'2026-podzim'),
  ('2026-podzim-r7','2026-11-04 20:45:00+01','P3','Pěstební dělníci A','Favorit FC',null,null,'2026-podzim'),
  ('2026-podzim-r8','2026-11-11 19:30:00+01','STER1','Pěstební dělníci A','XXX',null,null,'2026-podzim'),
  ('2026-podzim-r9','2026-11-18 19:15:00+01','HRAB2','Botič FC','Pěstební dělníci A',null,null,'2026-podzim'),
  ('2026-podzim-r10','2026-11-25 20:45:00+01','P1','Pěstební dělníci A','Olexton FC',null,null,'2026-podzim'),
  ('2026-podzim-r11','2026-12-09 20:15:00+01','ZABEH','Cirkus Praha','Pěstební dělníci A',null,null,'2026-podzim')
on conflict (psmf_key) do update set
  kickoff = excluded.kickoff,
  venue_code = excluded.venue_code,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  season = excluded.season;
