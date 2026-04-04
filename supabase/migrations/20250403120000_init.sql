-- OVUM RUSH — initial schema, RLS, indexes, seed
-- Run in Supabase SQL editor or via CLI.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  title text,
  tagline text,
  division text not null default 'Rookie Neon',
  ovr int not null default 70,
  wins int not null default 0,
  podiums int not null default 0,
  streak int not null default 0,
  rating int not null default 1000,
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  avatar_name text not null,
  color_theme text not null,
  tail_type text not null,
  aura_effect text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create table if not exists public.presence_rooms (
  id uuid primary key default gen_random_uuid(),
  room_slug text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  pos_x double precision not null default 0.5,
  pos_y double precision not null default 0.5,
  in_queue boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (room_slug, profile_id)
);

create index if not exists presence_rooms_room_slug_idx on public.presence_rooms (room_slug);
create index if not exists presence_rooms_queue_idx on public.presence_rooms (room_slug, in_queue);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_slug text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_slug, created_at desc);

create table if not exists public.race_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  seed int not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.race_entries (
  id uuid primary key default gen_random_uuid(),
  race_room_id uuid not null references public.race_rooms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  place int,
  score int not null default 0,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (race_room_id, profile_id)
);

create index if not exists race_entries_profile_idx on public.race_entries (profile_id);

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  wins int not null default 0,
  podiums int not null default 0,
  streak int not null default 0,
  rating int not null default 1000,
  rank int not null,
  computed_at timestamptz not null default now()
);

create index if not exists leaderboard_period_rank_idx
  on public.leaderboard_snapshots (period, rank);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_profile_id uuid references public.profiles (id) on delete set null,
  message_id uuid references public.chat_messages (id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  muted_profile_ids uuid[] not null default '{}',
  blocked_profile_ids uuid[] not null default '{}',
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- updated_at touch
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists avatars_updated_at on public.avatars;
create trigger avatars_updated_at
before update on public.avatars for each row execute function public.set_updated_at();

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
before update on public.user_settings for each row execute function public.set_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, title, tagline)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'Swimmer' || substr(new.id::text, 1, 4)),
    new.raw_user_meta_data->>'title',
    new.raw_user_meta_data->>'tagline'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Matchmaking: pick queued players and start race (SECURITY DEFINER)
create or replace function public.ovum_try_start_race(p_room text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r_id uuid;
  p1 uuid;
  p2 uuid;
  s int;
begin
  select profile_id into p1 from presence_rooms
    where room_slug = p_room and in_queue = true
    order by updated_at asc limit 1;
  if p1 is null then return null; end if;

  select profile_id into p2 from presence_rooms
    where room_slug = p_room and in_queue = true and profile_id <> p1
    order by updated_at asc limit 1;
  if p2 is null then return null; end if;

  s := (random() * 2147483647)::int;

  insert into race_rooms (status, seed, started_at)
  values ('running', s, now())
  returning id into r_id;

  insert into race_entries (race_room_id, profile_id, score, stats)
  values (r_id, p1, 0, '{}'), (r_id, p2, 0, '{}');

  update presence_rooms set in_queue = false, updated_at = now()
    where room_slug = p_room and profile_id in (p1, p2);

  return r_id;
end;
$$;

grant execute on function public.ovum_try_start_race(text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.avatars enable row level security;
alter table public.presence_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.race_rooms enable row level security;
alter table public.race_entries enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.reports enable row level security;
alter table public.user_settings enable row level security;

-- Profiles
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Avatars
create policy "avatars_select_all" on public.avatars for select using (true);
create policy "avatars_insert_own" on public.avatars for insert with check (auth.uid() = profile_id);
create policy "avatars_update_own" on public.avatars for update using (auth.uid() = profile_id);

-- Presence: everyone reads lobby; each user writes only their row
create policy "presence_select" on public.presence_rooms for select using (true);
create policy "presence_insert_own" on public.presence_rooms for insert
  with check (auth.uid() = profile_id);
create policy "presence_update_own" on public.presence_rooms for update
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "presence_delete_own" on public.presence_rooms for delete
  using (auth.uid() = profile_id);

-- Chat
create policy "chat_select" on public.chat_messages for select using (true);
create policy "chat_insert_own" on public.chat_messages for insert with check (auth.uid() = profile_id);

-- Race rooms
create policy "race_rooms_select_participant" on public.race_rooms for select using (
  exists (
    select 1 from public.race_entries e
    where e.race_room_id = race_rooms.id and e.profile_id = auth.uid()
  )
);
-- Inserts only via security definer RPC (ovum_try_start_race)

-- Race entries
create policy "race_entries_select" on public.race_entries for select using (
  exists (
    select 1 from public.race_entries e2
    where e2.race_room_id = race_entries.race_room_id and e2.profile_id = auth.uid()
  )
);
-- Rows created by ovum_try_start_race (security definer)
create policy "race_entries_update_own" on public.race_entries for update using (auth.uid() = profile_id);

-- Leaderboard snapshots (read-only for users; writes via service role / cron in production)
create policy "leaderboard_select" on public.leaderboard_snapshots for select using (true);

-- Reports
create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_select_own" on public.reports for select using (auth.uid() = reporter_id);

-- User settings
create policy "settings_all_own" on public.user_settings for all using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Realtime: in Dashboard → Database → Replication, enable for:
-- presence_rooms, chat_messages, race_rooms, race_entries

-- Seed example (optional — requires existing auth users; comment out if unused)
-- insert into public.profiles (id, nickname, title, tagline, ovr, wins, streak)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'DemoDash', 'Zone Runner', 'Touch grass? Never.', 88, 12, 3);

comment on table public.profiles is 'Public player profile; nickname visible to lobby.';
comment on table public.presence_rooms is 'Realtime lobby positions and queue flag.';
