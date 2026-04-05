-- Best distance (meters) for vertical rush arcade mode; one row per profile.
create table if not exists public.vertical_rush_best (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  best_distance_m integer not null default 0
    check (best_distance_m >= 0 and best_distance_m <= 2000000),
  runs_played integer not null default 0 check (runs_played >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists vertical_rush_best_distance_idx
  on public.vertical_rush_best (best_distance_m desc);

alter table public.vertical_rush_best enable row level security;

create policy "vertical_rush_best_select_all"
  on public.vertical_rush_best for select using (true);

create policy "vertical_rush_best_insert_own"
  on public.vertical_rush_best for insert with check (auth.uid() = profile_id);

create policy "vertical_rush_best_update_own"
  on public.vertical_rush_best for update using (auth.uid() = profile_id);

comment on table public.vertical_rush_best is 'OVUM RUSH vertical runner high scores (meters).';
