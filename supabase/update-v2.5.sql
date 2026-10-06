-- Kabina v2.5: historie sezon, komentáře, avatary a možnost zrušit účast.
-- Spusť jednou v Supabase SQL Editor -> Database. Je bezpečné spustit znovu.

alter table public.players add column if not exists avatar_url text;
alter table public.players add column if not exists psmf_games int not null default 0;
alter table public.players add column if not exists psmf_goals int not null default 0;
alter table public.players add column if not exists last_seen_at timestamptz;

drop policy if exists "own attendance delete" on public.attendance;
create policy "own attendance delete" on public.attendance
for delete to authenticated
using (player_id in (select id from public.players where user_id = auth.uid()));

create table if not exists public.seasons (
  season text primary key,
  label text not null,
  year int not null,
  phase text not null,
  division text,
  team_name text not null,
  source_url text,
  final_rank int,
  played int,
  wins int,
  draws int,
  losses int,
  score text,
  points int,
  synced_at timestamptz not null default now()
);
alter table public.seasons enable row level security;
drop policy if exists "seasons readable" on public.seasons;
create policy "seasons readable" on public.seasons for select using (true);


create table if not exists public.historical_standings (
  season text not null references public.seasons(season) on delete cascade,
  rank int not null,
  team text not null,
  played int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  score text,
  points int not null default 0,
  synced_at timestamptz not null default now(),
  primary key (season,team)
);
alter table public.historical_standings enable row level security;
drop policy if exists "historical standings readable" on public.historical_standings;
create policy "historical standings readable" on public.historical_standings for select using (true);

create table if not exists public.historical_matches (
  psmf_key text primary key,
  season text not null references public.seasons(season) on delete cascade,
  kickoff timestamptz not null,
  venue_code text,
  home_team text not null,
  away_team text not null,
  home_score int,
  away_score int,
  round int,
  team_name text not null,
  synced_at timestamptz not null default now()
);
create index if not exists historical_matches_season_idx on public.historical_matches(season,kickoff);
alter table public.historical_matches enable row level security;
drop policy if exists "historical matches readable" on public.historical_matches;
create policy "historical matches readable" on public.historical_matches for select using (true);

create table if not exists public.player_season_stats (
  season text not null references public.seasons(season) on delete cascade,
  player_name text not null,
  games int not null default 0,
  goals int not null default 0,
  synced_at timestamptz not null default now(),
  primary key (season,player_name)
);
alter table public.player_season_stats enable row level security;
drop policy if exists "player season stats readable" on public.player_season_stats;
create policy "player season stats readable" on public.player_season_stats for select using (true);

create table if not exists public.match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  parent_id uuid references public.match_comments(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists match_comments_match_idx on public.match_comments(match_id,created_at);
alter table public.match_comments enable row level security;

drop policy if exists "comments readable by team" on public.match_comments;
create policy "comments readable by team" on public.match_comments
for select to authenticated using (true);

drop policy if exists "comments insert own profile" on public.match_comments;
create policy "comments insert own profile" on public.match_comments
for insert to authenticated
with check (player_id in (select id from public.players where user_id=auth.uid()));

drop policy if exists "comments update own" on public.match_comments;
create policy "comments update own" on public.match_comments
for update to authenticated
using (player_id in (select id from public.players where user_id=auth.uid()))
with check (player_id in (select id from public.players where user_id=auth.uid()));

drop policy if exists "comments delete own or admin" on public.match_comments;
create policy "comments delete own or admin" on public.match_comments
for delete to authenticated
using (
  player_id in (select id from public.players where user_id=auth.uid())
  or exists (select 1 from public.players where user_id=auth.uid() and role in ('captain','admin'))
);

create or replace function public.set_my_avatar(url text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.players set avatar_url=url where user_id=auth.uid();
  if not found then raise exception 'Player profile not linked'; end if;
end;
$$;
grant execute on function public.set_my_avatar(text) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('player-avatars','player-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "avatar upload own folder" on storage.objects;
create policy "avatar upload own folder" on storage.objects
for insert to authenticated
with check (bucket_id='player-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "avatar update own folder" on storage.objects;
create policy "avatar update own folder" on storage.objects
for update to authenticated
using (bucket_id='player-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "avatar delete own folder" on storage.objects;
create policy "avatar delete own folder" on storage.objects
for delete to authenticated
using (bucket_id='player-avatars' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.list_public_players()
returns table(display_name text, psmf_games int, psmf_goals int, avatar_url text)
language sql
security definer
set search_path=public
stable
as $$
  select p.display_name,p.psmf_games,p.psmf_goals,p.avatar_url
  from public.players p
  where p.active=true
  order by p.display_name;
$$;
grant execute on function public.list_public_players() to anon, authenticated;

-- v2.5.1: bezpečná správa rolí a bootstrap prvního admina.
create or replace function public.bootstrap_admin()
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  my_player uuid;
  admin_count int;
begin
  if auth.uid() is null then return false; end if;
  select id into my_player from public.players where user_id=auth.uid() limit 1;
  if my_player is null then return false; end if;
  select count(*) into admin_count from public.players where role='admin' and user_id is not null;
  if admin_count=0 then
    update public.players set role='admin' where id=my_player;
    return true;
  end if;
  return false;
end;
$$;
grant execute on function public.bootstrap_admin() to authenticated;

create or replace function public.admin_list_players()
returns table(id uuid, display_name text, email text, role text, active boolean, user_id uuid, avatar_url text)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not exists(select 1 from public.players p where p.user_id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Admin access required';
  end if;
  return query
  select p.id,p.display_name,u.email::text,p.role,p.active,p.user_id,p.avatar_url
  from public.players p
  left join auth.users u on u.id=p.user_id
  order by p.display_name;
end;
$$;
grant execute on function public.admin_list_players() to authenticated;

create or replace function public.admin_set_player_role(target_player_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  target_is_me boolean;
  admins int;
begin
  if not exists(select 1 from public.players p where p.user_id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Admin access required';
  end if;
  if new_role not in ('player','captain','admin') then raise exception 'Invalid role'; end if;
  select (user_id=auth.uid()) into target_is_me from public.players where id=target_player_id;
  if coalesce(target_is_me,false) and new_role<>'admin' then
    select count(*) into admins from public.players where role='admin' and user_id is not null and active=true;
    if admins<=1 then raise exception 'Nelze odebrat posledního admina'; end if;
  end if;
  update public.players set role=new_role where id=target_player_id;
end;
$$;
grant execute on function public.admin_set_player_role(uuid,text) to authenticated;

create or replace function public.admin_set_player_active(target_player_id uuid, new_active boolean)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  target_is_me boolean;
  target_role text;
  admins int;
begin
  if not exists(select 1 from public.players p where p.user_id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Admin access required';
  end if;
  select user_id=auth.uid(), role into target_is_me,target_role from public.players where id=target_player_id;
  if coalesce(target_is_me,false) and new_active=false and target_role='admin' then
    select count(*) into admins from public.players where role='admin' and user_id is not null and active=true;
    if admins<=1 then raise exception 'Nelze deaktivovat posledního admina'; end if;
  end if;
  update public.players set active=new_active where id=target_player_id;
end;
$$;
grant execute on function public.admin_set_player_active(uuid,boolean) to authenticated;

create or replace function public.admin_unlink_player(target_player_id uuid)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  target_user uuid;
  target_role text;
  admins int;
begin
  if not exists(select 1 from public.players p where p.user_id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Admin access required';
  end if;
  select user_id,role into target_user,target_role from public.players where id=target_player_id;
  if target_user=auth.uid() and target_role='admin' then
    select count(*) into admins from public.players where role='admin' and user_id is not null and active=true;
    if admins<=1 then raise exception 'Nelze odpojit posledního admina'; end if;
  end if;
  update public.players set user_id=null where id=target_player_id;
end;
$$;
grant execute on function public.admin_unlink_player(uuid) to authenticated;
