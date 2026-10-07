-- Kabina v3.8: datum ankety, foto na pozadí a archiv.
-- Run once in Supabase SQL Editor. Safe to re-run.

alter table public.team_posts
  add column if not exists event_date date;

alter table public.team_posts
  add column if not exists background_url text;

create index if not exists team_posts_event_date_idx
  on public.team_posts(event_date);

-- Public image bucket for poll/event backgrounds.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-images',
  'board-images',
  true,
  7340032,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public=true,
    file_size_limit=7340032,
    allowed_mime_types=array['image/jpeg','image/png','image/webp'];

notify pgrst, 'reload schema';
