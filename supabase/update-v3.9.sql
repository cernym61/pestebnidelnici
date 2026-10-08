-- Kabina v3.9: komentáře k anketám + nepřečtené položky na Nástěnce.
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.team_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.team_posts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  parent_id uuid references public.team_post_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists team_post_comments_post_idx
  on public.team_post_comments(post_id, created_at);

create index if not exists team_post_comments_parent_idx
  on public.team_post_comments(parent_id);

create table if not exists public.team_board_reads (
  player_id uuid primary key references public.players(id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.team_post_comments enable row level security;
alter table public.team_board_reads enable row level security;

-- Both tables are server-only. Next.js API validates the logged-in player.
drop policy if exists "team post comments direct read" on public.team_post_comments;
drop policy if exists "team board reads direct read" on public.team_board_reads;

notify pgrst, 'reload schema';
