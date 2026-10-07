-- Kabina v3.6.3: soukromí týmové účasti.
-- Run once in Supabase SQL Editor. Safe to re-run.

drop function if exists public.public_player_roster(uuid);

create function public.public_player_roster(target_match_id uuid default null)
returns table(
  id uuid,
  display_name text,
  avatar_url text,
  registration_id text,
  jersey_number integer,
  attending boolean
)
language plpgsql
security definer
set search_path=public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists(
    select 1
    from public.players p
    where p.user_id=auth.uid()
      and p.active=true
  ) then
    raise exception 'Active player profile required';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.registration_id,
    p.jersey_number,
    exists (
      select 1
      from public.attendance a
      where a.player_id=p.id
        and a.match_id=target_match_id
        and a.status='yes'
    ) as attending
  from public.players p
  where p.active=true
  order by p.display_name;
end;
$$;

revoke all on function public.public_player_roster(uuid) from public;
revoke all on function public.public_player_roster(uuid) from anon;
grant execute on function public.public_player_roster(uuid) to authenticated;

notify pgrst, 'reload schema';
