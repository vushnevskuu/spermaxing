# OVUM RUSH

Neon meme arcade: lobby chat, top-zone matchmaking, micro-races, and a player card. **18+** entertainment only — not medical.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS 4
- shadcn/ui (Radix), Framer Motion, Zod, Zustand
- Supabase (Auth, Postgres, Realtime)

## Local run

```bash
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or leave unset for mock mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor: run migrations **in order**:
   - `supabase/migrations/20250403120000_init.sql`
   - `supabase/migrations/20250404100000_chat_whisper.sql`
   - `supabase/migrations/20250405120000_avatar_cosmetics.sql`
3. Authentication → enable **Anonymous sign-ins**.
4. Database → Replication: add `presence_rooms`, `chat_messages` (and optionally `race_rooms`, `race_entries`) to `supabase_realtime`.
5. Put URL and anon key in `.env.local`.

Without env vars the app runs in **mock mode** (local profile, lobby bots, demo race).

## Deploy (Vercel)

1. Push the repo to **GitHub** (or Git provider linked to Vercel).
2. **Supabase** (see section above): run all three migrations, enable **Anonymous** sign-ins, add `chat_messages` and `presence_rooms` to **Realtime** publication.
3. **Vercel** → New Project → Import repo → Framework **Next.js**.
4. Add env vars (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Deploy and copy your `https://<project>.vercel.app` URL.
6. **Supabase** → Authentication → URL configuration: set **Site URL** to that origin; add **Redirect URL** `https://<project>.vercel.app/auth/callback` (and keep `http://localhost:3000/auth/callback` for local dev if you want).

Step-by-step (Russian): [docs/deploy-vercel-ru.md](docs/deploy-vercel-ru.md).

## Scripts

- `npm run dev` — dev (Turbopack)
- `npm run build` / `npm run start` — production
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Structure

- `app/` — routes and API (`/api/onboarding`, `/api/chat`, `/api/report`, `/api/register-nick`)
- `components/` — UI, lobby, race, landing
- `lib/` — utils, Supabase clients, validation, text moderation
- `hooks/` — shared hooks
- `store/` — Zustand
- `styles/` — global Tailwind styles
- `supabase/migrations/` — SQL schema and RLS

## v2 ideas

- Weekly leaderboard via `leaderboard_snapshots` + cron / Edge Function
- Server-validated race finish + anti-cheat heuristics
- Block/mute synced to `user_settings` in the DB
- More card templates and PNG export (html2canvas / Satori)
- Club rooms (still no separate DM inbox)
- Stronger toxicity filter + mod tools
