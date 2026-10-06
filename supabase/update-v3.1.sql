-- Kabina v3.1: richer PSMF detail archive + optional advanced per-match player stats.
-- Safe to run repeatedly.

create table if not exists public.psmf_season_details (
  season text primary key,
  label text,
  source_url text,
  details_text text not null default '',
  synced_at timestamptz not null default now()
);

alter table public.psmf_season_details enable row level security;
-- No direct browser policies needed; sync/API use the service role.

create table if not exists public.player_match_advanced_stats (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  match_key text not null,
  match_date date,
  opponent text,
  player_name text not null,
  minutes_played integer check (minutes_played is null or minutes_played between 0 and 60),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  man_of_match boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_key,player_name)
);

create index if not exists player_match_advanced_stats_player_idx
  on public.player_match_advanced_stats(player_name,match_date desc);

alter table public.player_match_advanced_stats enable row level security;
-- Deliberately server-only for now. A later admin UI can manage these values safely.

notify pgrst, 'reload schema';
