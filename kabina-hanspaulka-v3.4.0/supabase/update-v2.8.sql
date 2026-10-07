-- Kabina v2.8: ID hráčů, čísla dresů a oprava profilových fotek.

alter table public.players add column if not exists registration_id text;
alter table public.players add column if not exists jersey_number integer;

update public.players set registration_id='49435', jersey_number=66 where display_name='Landfeld Jan';
update public.players set registration_id='50477', jersey_number=10 where display_name='Horák Adam';
update public.players set registration_id='54779', jersey_number=6 where display_name='Landfeld Vít';
update public.players set registration_id='43213', jersey_number=37 where display_name='Kolář Adam';
update public.players set registration_id='43150', jersey_number=11 where display_name='Dusil Jan';
update public.players set registration_id='49331', jersey_number=17 where display_name='Bouzek Filip Oliver';
update public.players set registration_id='49986', jersey_number=81 where display_name='Herko Daniel';
update public.players set registration_id='53549', jersey_number=7 where display_name='Jelenčiak Jakub';
update public.players set registration_id='49364', jersey_number=2 where display_name='Černý Martin';
update public.players set registration_id='39466', jersey_number=34 where display_name='Kubala Martin';
update public.players set registration_id='43149', jersey_number=21 where display_name='Veselý Mikuláš';
update public.players set registration_id='53607', jersey_number=9 where display_name='Sigmund Radek';
update public.players set registration_id='43146', jersey_number=8 where display_name='Kozák Tomáš';

-- Avatar bucket must stay public; also allow reads through Storage API.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('player-avatars','player-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects
for select to public
using (bucket_id='player-avatars');

-- Recreate admin player list with match registration data.
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
  jersey_number integer
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
  select p.id,p.display_name,u.email::text,p.role,p.active,p.user_id,p.avatar_url,p.registration_id,p.jersey_number
  from public.players p
  left join auth.users u on u.id=p.user_id
  order by p.display_name;
end;
$$;

grant execute on function public.admin_list_players() to authenticated;

create or replace function public.admin_set_player_game_data(
  target_player_id uuid,
  new_registration_id text,
  new_jersey_number integer
)
returns void
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

  if new_jersey_number is not null and (new_jersey_number < 0 or new_jersey_number > 99) then
    raise exception 'Invalid jersey number';
  end if;

  update public.players
  set registration_id=nullif(trim(new_registration_id),''),
      jersey_number=new_jersey_number
  where id=target_player_id;
end;
$$;

grant execute on function public.admin_set_player_game_data(uuid,text,integer) to authenticated;

notify pgrst, 'reload schema';
