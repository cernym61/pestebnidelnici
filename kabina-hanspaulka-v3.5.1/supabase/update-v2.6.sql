-- Kabina v2.6
-- E-mailové reminder statistiky nevyžadují změnu databázového schématu.
-- Tento patch zároveň opravuje/obnovuje administrační RPC funkce, pokud ještě nebyl spuštěn v2.5.3 fix.

create or replace function public.admin_list_players()
returns table(
  id uuid,
  display_name text,
  email text,
  role text,
  active boolean,
  user_id uuid,
  avatar_url text
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
  select p.id,p.display_name,u.email::text,p.role,p.active,p.user_id,p.avatar_url
  from public.players p
  left join auth.users u on u.id=p.user_id
  order by p.display_name;
end;
$$;

grant execute on function public.admin_list_players() to authenticated;

create or replace function public.admin_set_player_role(target_player_id uuid,new_role text)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare target_is_me boolean; admins int;
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

create or replace function public.admin_set_player_active(target_player_id uuid,new_active boolean)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare target_is_me boolean; target_role text; admins int;
begin
  if not exists(select 1 from public.players p where p.user_id=auth.uid() and p.role='admin' and p.active=true) then
    raise exception 'Admin access required';
  end if;
  select user_id=auth.uid(),role into target_is_me,target_role from public.players where id=target_player_id;
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
declare target_user uuid; target_role text; admins int;
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

update public.players set role='admin' where display_name='Černý Martin';
notify pgrst, 'reload schema';
