-- Run this file in the Supabase SQL Editor for your project.
-- Add admin accounts through Supabase Auth, then grant each account access
-- by inserting its Auth user UUID into public.admin_users.
-- Example after creating an account privately in Supabase Auth:
-- insert into public.admin_users (user_id) values ('AUTH_USER_UUID_HERE');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  artist text not null check (char_length(artist) between 1 and 90),
  listen_url text not null check (listen_url ~* '^https?://'),
  audio_url text check (audio_url is null or audio_url ~* '^https?://'),
  artwork_url text check (artwork_url is null or artwork_url ~* '^https?://'),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  event_date date,
  location text not null check (char_length(location) between 1 and 90),
  description text not null check (char_length(description) between 1 and 300),
  image_url text check (image_url is null or image_url ~* '^https?://'),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.music_tracks enable row level security;
alter table public.events enable row level security;

revoke all on public.admin_users, public.music_tracks, public.events from anon, authenticated;
grant select on public.music_tracks, public.events to anon, authenticated;
grant insert, update, delete on public.music_tracks, public.events to authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to anon, authenticated;

drop policy if exists "Anyone can read published music" on public.music_tracks;
create policy "Anyone can read published music"
  on public.music_tracks for select to anon, authenticated
  using (is_published or (select public.is_site_admin()));

drop policy if exists "Admins can insert music" on public.music_tracks;
create policy "Admins can insert music"
  on public.music_tracks for insert to authenticated
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can update music" on public.music_tracks;
create policy "Admins can update music"
  on public.music_tracks for update to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can delete music" on public.music_tracks;
create policy "Admins can delete music"
  on public.music_tracks for delete to authenticated
  using ((select public.is_site_admin()));

drop policy if exists "Anyone can read published events" on public.events;
create policy "Anyone can read published events"
  on public.events for select to anon, authenticated
  using (is_published or (select public.is_site_admin()));

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
  on public.events for insert to authenticated
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete to authenticated
  using ((select public.is_site_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-assets',
  'music-assets',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac',
        'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read published music assets" on storage.objects;
create policy "Anyone can read published music assets"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'music-assets');

drop policy if exists "Admins can upload music assets" on storage.objects;
create policy "Admins can upload music assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'music-assets' and (select public.is_site_admin()));

drop policy if exists "Admins can update music assets" on storage.objects;
create policy "Admins can update music assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'music-assets' and (select public.is_site_admin()))
  with check (bucket_id = 'music-assets' and (select public.is_site_admin()));

drop policy if exists "Admins can delete music assets" on storage.objects;
create policy "Admins can delete music assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'music-assets' and (select public.is_site_admin()));
