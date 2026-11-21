-- CRAZI Community Supabase schema
-- Run in Supabase SQL Editor. Then create a public Storage bucket named community-media (5 MB limit).
create extension if not exists pgcrypto;
create table if not exists public.profiles(
 id uuid primary key,
 recovery_hash text unique not null,
 display_name text default 'Community Member',
 created_at timestamptz default now()
);
create table if not exists public.posts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null,
 author_name text,
 content text,
 image_url text,
 like_count integer not null default 0,
 created_at timestamptz default now()
);
create table if not exists public.comments(
 id uuid primary key default gen_random_uuid(),
 post_id uuid references public.posts(id) on delete cascade,
 profile_id uuid not null,
 author_name text,
 body text not null,
 created_at timestamptz default now()
);
create table if not exists public.post_likes(
 id uuid primary key default gen_random_uuid(),
 post_id uuid references public.posts(id) on delete cascade,
 profile_id uuid not null,
 created_at timestamptz default now(),
 unique(post_id,profile_id)
);
create table if not exists public.applications(
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null,
 applicant_name text,
 topic text,
 details text,
 image_url text,
 status text default 'pending',
 created_at timestamptz default now()
);
create table if not exists public.notices(
 id uuid primary key default gen_random_uuid(),
 message text not null,
 created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.applications enable row level security;
alter table public.notices enable row level security;
-- Public community read/write policies. This is an anonymous community; add moderation/rate limits before public launch.
create policy "profiles insert" on public.profiles for insert to anon with check (true);
create policy "posts read" on public.posts for select to anon using (true);
create policy "posts insert" on public.posts for insert to anon with check (true);
create policy "comments read" on public.comments for select to anon using (true);
create policy "comments insert" on public.comments for insert to anon with check (true);
create policy "likes read" on public.post_likes for select to anon using (true);
create policy "likes insert" on public.post_likes for insert to anon with check (true);
create policy "apps insert" on public.applications for insert to anon with check (true);
create policy "notices read" on public.notices for select to anon using (true);
create or replace function public.recover_profile(p_recovery_hash text)
returns table(id uuid, display_name text, created_at timestamptz)
language sql security definer set search_path=public
as $$ select p.id,p.display_name,p.created_at from profiles p where p.recovery_hash=p_recovery_hash limit 1 $$;
grant execute on function public.recover_profile(text) to anon;
-- Storage: public image reads, anonymous uploads. Restrict size/type in Storage settings too.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do nothing;
create policy "community media public read" on storage.objects for select to anon using (bucket_id='community-media');
create policy "community media anonymous upload" on storage.objects for insert to anon with check (bucket_id='community-media');

create or replace function public.increment_post_like(p_post_id uuid)
returns void language sql security definer set search_path=public
as $$ update public.posts set like_count=like_count+1 where id=p_post_id $$;
grant execute on function public.increment_post_like(uuid) to anon;
