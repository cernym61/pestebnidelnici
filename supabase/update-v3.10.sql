-- Kabina v3.10: automatické hledání nové sezóny PSMF.
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.season_state (
  id smallint primary key default 1 check (id = 1),
  current_season text not null,
  current_url text not null,
  current_year integer not null,
  current_phase text not null check (current_phase in ('jaro','podzim')),
  current_division text not null,
  status text not null default 'active' check (status in ('active','waiting')),
  waiting_for_season text,
  waiting_for_label text,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.season_state(
  id,current_season,current_url,current_year,current_phase,current_division,status,updated_at
)
values(
  1,
  '2026-podzim',
  'https://www.psmf.cz/souteze/2026-hanspaulska-liga-podzim/5-d/tymy/pestebni-delnici-a/',
  2026,
  'podzim',
  '5D',
  'active',
  now()
)
on conflict (id) do nothing;

alter table public.season_state enable row level security;
drop policy if exists "season state direct read" on public.season_state;

notify pgrst, 'reload schema';
