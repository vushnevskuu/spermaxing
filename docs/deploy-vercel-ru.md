# Деплой на Vercel + Supabase — что сделать вручную

Репозиторий уже готов к сборке (`npm run build`). Ниже — только шаги в облаках (нужны твой GitHub, аккаунты Vercel и Supabase).

## 1. GitHub

- Создай репозиторий и **запушь этот проект** (если ещё не в облаке).

## 2. Supabase (сначала база)

1. [supabase.com](https://supabase.com) → New project (Free).
2. **SQL Editor** — выполни файлы **по порядку** (скопируй содержимое из репозитория):
   - `supabase/migrations/20250403120000_init.sql`
   - `supabase/migrations/20250404100000_chat_whisper.sql`
   - `supabase/migrations/20250405120000_avatar_cosmetics.sql`
   - `supabase/migrations/20250406120000_prune_stale_presence.sql`
3. **Authentication** → Providers → **Anonymous** — включить.
4. **Обязательно — Realtime (без этого «друзья не двигаются» и чужие сообщения не видны):**
   - **Database** → **Publications** → выбери публикацию **`supabase_realtime`** → **включи таблицы** **`chat_messages`** и **`presence_rooms`** → **Save**.
   - В старом UI это могло называться **Database → Replication**; суть одна: обе таблицы должны участвовать в Realtime.
5. **Project Settings → API** — скопируй **Project URL** и **anon public** key (понадобятся в Vercel).

После деплоя в коде есть **редкий запасной опрос позиций из БД** и **подгрузка истории чата при входе** — но чтобы **второй игрок** видел чат и движение **вживую**, пункт 4 (Realtime) всё равно обязателен.

### Редиректы Auth (удобный порядок)

- Сразу после **первого** деплоя на Vercel у тебя будет URL вида `https://xxxx.vercel.app`.
- **Authentication → URL Configuration**:
  - **Site URL**: `https://xxxx.vercel.app` (подставь свой).
  - **Redirect URLs**: добавь ровно  
    `https://xxxx.vercel.app/auth/callback`  
  - Для локалки можно оставить также `http://localhost:3000/auth/callback`.



### Разовая очистка лобби (после тестов с «призраками»)

В **SQL Editor** можно выполнить (slug лобби в коде сейчас `main`):

```sql
delete from public.presence_rooms where room_slug = 'main';
```

### Периодическое удаление старых presence (рекомендуется)

Миграция `20250406120000_prune_stale_presence.sql` создаёт функцию `public.ovum_prune_stale_presence('main')`, которая удаляет строки старше **15 минут**. Подключи **pg_cron** (или Scheduled Triggers в Supabase) и вызывай её каждые **5–10 минут**, иначе после обрыва сессий аватары могут долго висеть в БД.

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → Import репозитория с GitHub.
2. Framework: **Next.js** (по умолчанию).
3. **Environment Variables** (и для Production, и для Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = URL проекта Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
4. **Deploy**.
5. Если редирект в Supabase ещё не совпадал с выданным доменом — обнови **Site URL** и **Redirect URLs** (шаг 2) и сохрани.

## 4. Проверка

- Открой прод-URL Vercel в двух браузерах (или инкогнито + обычный).
- Не включай **guest/mock** для проверки сети (нужен live Supabase).
- Напиши в лобби-чат — сообщение должно появиться у второго клиента.

## Если сборка на Vercel упала

- Открой вкладку **Deployments → Build Logs** и пришли текст ошибки.
