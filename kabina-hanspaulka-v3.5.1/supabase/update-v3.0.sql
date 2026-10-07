-- Kabina v3.0: usage metering for real AI agent.
-- Safe to run repeatedly.

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_requests_user_created_idx on public.ai_requests(user_id,created_at);
create index if not exists ai_requests_created_idx on public.ai_requests(created_at);

alter table public.ai_requests enable row level security;
-- No client policies: only server-side service role may read/write usage.

notify pgrst, 'reload schema';
