-- Kabina v3.6: týmová nástěnka, příspěvky, ankety a hlasování.
-- Run once in Supabase SQL Editor. Safe to re-run.

create table if not exists public.team_posts (
  id uuid primary key default gen_random_uuid(),
  author_player_id uuid not null references public.players(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  poll_question text,
  email_sent boolean not null default false,
  push_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.team_posts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists team_post_option_order_uidx
  on public.team_post_poll_options(post_id,sort_order);

create table if not exists public.team_post_votes (
  post_id uuid not null references public.team_posts(id) on delete cascade,
  option_id uuid not null references public.team_post_poll_options(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,player_id)
);

create index if not exists team_post_votes_option_idx on public.team_post_votes(option_id);
create index if not exists team_posts_created_idx on public.team_posts(created_at desc);

alter table public.team_posts enable row level security;
alter table public.team_post_poll_options enable row level security;
alter table public.team_post_votes enable row level security;

-- These tables are intentionally server-only.
-- The Next.js API validates the logged-in player and uses the service-role key.
drop policy if exists "team posts direct read" on public.team_posts;
drop policy if exists "team post options direct read" on public.team_post_poll_options;
drop policy if exists "team post votes direct read" on public.team_post_votes;

notify pgrst, 'reload schema';
