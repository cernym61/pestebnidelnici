-- Run in Supabase SQL Editor after creating your project.
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  psmf_name text unique,
  user_id uuid unique references auth.users(id) on delete set null,
  role text not null default 'player' check (role in ('player','captain','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  psmf_key text unique,
  kickoff timestamptz not null,
  venue_code text,
  venue_address text,
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  season text not null default '2026-podzim'
);

create table if not exists public.attendance (
  match_id uuid references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  status text not null check (status in ('yes','no','maybe')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.attendance enable row level security;

create policy "matches readable" on public.matches for select using (true);
create policy "players readable by signed in" on public.players for select to authenticated using (true);
create policy "own attendance readable" on public.attendance for select to authenticated using (
  player_id in (select id from public.players where user_id = auth.uid())
);
create policy "own attendance insert" on public.attendance for insert to authenticated with check (
  player_id in (select id from public.players where user_id = auth.uid())
);
create policy "own attendance update" on public.attendance for update to authenticated using (
  player_id in (select id from public.players where user_id = auth.uid())
);
