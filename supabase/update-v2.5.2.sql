-- v2.5.2: Martin Černý má být správcem týmu.
update public.players
set role = 'admin'
where display_name = 'Černý Martin';
