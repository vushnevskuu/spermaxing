-- Удаление «зависших» строк лобби в presence_rooms (старые сессии / краш вкладки).
-- Вызывай из Supabase: Database → Extensions → pg_cron → scheduled job, например каждые 5–10 минут:
--   select public.ovum_prune_stale_presence('main');
-- slug должен совпадать с LOBBY_ROOM_SLUG в приложении (сейчас main).

create or replace function public.ovum_prune_stale_presence(p_room_slug text default 'main')
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.presence_rooms
    where room_slug = p_room_slug
      and updated_at < now() - interval '15 minutes'
    returning 1
  )
  select coalesce((select count(*)::int from deleted), 0);
$$;

revoke all on function public.ovum_prune_stale_presence(text) from public;
grant execute on function public.ovum_prune_stale_presence(text) to service_role;

comment on function public.ovum_prune_stale_presence(text) is
  'Deletes stale lobby presence rows; schedule via pg_cron or Supabase Scheduled Triggers.';
