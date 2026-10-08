-- Kabina v3.11: neveřejná týmová kabina + host + bezpečná registrace kódem.
-- Run once in Supabase SQL Editor. Safe to re-run.

-- One-time registration code for every active unclaimed player.
alter table public.players
  add column if not exists signup_code text;

create unique index if not exists players_signup_code_uidx
  on public.players(signup_code)
  where signup_code is not null;

update public.players
set signup_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
where active=true
  and user_id is null
  and signup_code is null;

-- Already-linked players never need a registration code.
update public.players
set signup_code = null
where user_id is not null;

-- Only names that are still available are shown in registration.
create or replace function public.list_signup_players()
returns table(display_name text)
language sql
security definer
set search_path=public
stable
as $$
  select p.display_name
  from public.players p
  where p.active=true
    and p.user_id is null
  order by p.display_name;
$$;

grant execute on function public.list_signup_players() to anon, authenticated;

-- Disable the old claim function which allowed claiming by name only.
revoke execute on function public.claim_player(text) from public;
revoke execute on function public.claim_player(text) from anon;
revoke execute on function public.claim_player(text) from authenticated;

-- A new account can claim an unclaimed player only with that player's one-time code.
create or replace function public.claim_player_with_code(player_name text, invite_code text)
returns public.players
language plpgsql
security definer
set search_path=public
as $$
declare
  claimed public.players;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists(select 1 from public.players where user_id=auth.uid()) then
    select * into claimed from public.players where user_id=auth.uid() limit 1;
    return claimed;
  end if;

  update public.players
  set user_id=auth.uid(),
      signup_code=null
  where display_name=player_name
    and active=true
    and user_id is null
    and upper(signup_code)=upper(trim(invite_code))
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Invalid registration code or player is no longer available';
  end if;

  return claimed;
end;
$$;

revoke all on function public.claim_player_with_code(text,text) from public;
grant execute on function public.claim_player_with_code(text,text) to authenticated;

-- Admin can regenerate a code if one was accidentally shared.
create or replace function public.admin_regenerate_signup_code(target_player_id uuid)
returns text
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  new_code text;
begin
  if not exists(
    select 1 from public.players p
    where p.user_id=auth.uid() and p.role='admin' and p.active=true
  ) then
    raise exception 'Admin access required';
  end if;

  if exists(select 1 from public.players where id=target_player_id and user_id is not null) then
    raise exception 'Player already has an account';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  update public.players
  set signup_code=new_code
  where id=target_player_id and active=true;

  return new_code;
end;
$$;

revoke all on function public.admin_regenerate_signup_code(uuid) from public;
grant execute on function public.admin_regenerate_signup_code(uuid) to authenticated;

-- Extend the admin player list so the admin can privately share codes.
drop function if exists public.admin_list_players();

create function public.admin_list_players()
returns table(
  id uuid,
  display_name text,
  email text,
  role text,
  active boolean,
  user_id uuid,
  avatar_url text,
  registration_id text,
  jersey_number integer,
  signup_code text
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not exists(
    select 1 from public.players p
    where p.user_id=auth.uid() and p.role='admin' and p.active=true
  ) then
    raise exception 'Admin access required';
  end if;

  return query
  select p.id,p.display_name,u.email::text,p.role,p.active,p.user_id,p.avatar_url,
         p.registration_id,p.jersey_number,p.signup_code
  from public.players p
  left join auth.users u on u.id=p.user_id
  order by p.display_name;
end;
$$;

grant execute on function public.admin_list_players() to authenticated;

-- Public/guest may only use the league standings.
-- Private team data is readable only by authenticated users.
drop policy if exists "matches readable" on public.matches;
create policy "matches readable by signed in" on public.matches
for select to authenticated using (true);

drop policy if exists "venues readable" on public.venues;
create policy "venues readable by signed in" on public.venues
for select to authenticated using (true);

drop policy if exists "seasons readable" on public.seasons;
create policy "seasons readable by signed in" on public.seasons
for select to authenticated using (true);

drop policy if exists "historical standings readable" on public.historical_standings;
create policy "historical standings readable by signed in" on public.historical_standings
for select to authenticated using (true);

drop policy if exists "historical matches readable" on public.historical_matches;
create policy "historical matches readable by signed in" on public.historical_matches
for select to authenticated using (true);

drop policy if exists "player season stats readable" on public.player_season_stats;
create policy "player season stats readable by signed in" on public.player_season_stats
for select to authenticated using (true);

-- Player list itself is no longer available anonymously.
revoke execute on function public.list_public_players() from anon;
grant execute on function public.list_public_players() to authenticated;

-- The standings policy stays public intentionally: this is the only data guests see.
notify pgrst, 'reload schema';



-- v3.12: future players automatically get a code as soon as they are created/activated.
create or replace function public.ensure_player_signup_code()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  candidate text;
begin
  -- A linked account never needs a registration code.
  if new.user_id is not null then
    new.signup_code := null;
    return new;
  end if;

  -- Only active unclaimed players receive a code.
  if coalesce(new.active,false)=true and new.signup_code is null then
    loop
      candidate := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
      exit when not exists(
        select 1 from public.players p
        where p.signup_code=candidate
          and (tg_op='INSERT' or p.id<>new.id)
      );
    end loop;
    new.signup_code := candidate;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_player_signup_code_trg on public.players;
create trigger ensure_player_signup_code_trg
before insert or update of active,user_id,signup_code
on public.players
for each row
execute function public.ensure_player_signup_code();

-- Backfill any active, unclaimed player that still has no code.
update public.players
set signup_code = null
where active=true
  and user_id is null
  and signup_code is null;

-- Admin can add a player before he appears on PSMF.
-- If the exact display name already exists unclaimed, it is simply reactivated.
create or replace function public.admin_add_player(new_display_name text)
returns table(id uuid, display_name text, signup_code text)
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  clean_name text;
  existing public.players;
  created public.players;
begin
  if not exists(
    select 1 from public.players p
    where p.user_id=auth.uid() and p.role='admin' and p.active=true
  ) then
    raise exception 'Admin access required';
  end if;

  clean_name := trim(regexp_replace(coalesce(new_display_name,''), '\s+', ' ', 'g'));
  if clean_name='' then
    raise exception 'Player name is required';
  end if;

  select * into existing
  from public.players p
  where lower(p.display_name)=lower(clean_name)
  limit 1;

  if existing.id is not null then
    if existing.user_id is not null then
      raise exception 'Player already has an account';
    end if;

    update public.players p
    set active=true,
        psmf_name=coalesce(p.psmf_name,clean_name)
    where p.id=existing.id
    returning p.* into created;
  else
    insert into public.players(display_name,psmf_name,active)
    values(clean_name,clean_name,true)
    returning * into created;
  end if;

  return query select created.id,created.display_name,created.signup_code;
end;
$$;

revoke all on function public.admin_add_player(text) from public;
grant execute on function public.admin_add_player(text) to authenticated;

notify pgrst, 'reload schema';
