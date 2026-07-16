# Almanac

A personal, unified media log — one place to record, rate, and review
everything across **film, TV, games, books, and music**. Replaces the
Letterboxd / Backloggd / Goodreads / RYM constellation with a single
self-owned app. See [`PROJECT.md`](./PROJECT.md) for the full plan.

- **Stack:** Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres + RLS + Auth + Edge Functions) · installable PWA
- **Metadata sources:** TMDB (film/TV) · RAWG (games) · OpenLibrary (books) · MusicBrainz + Cover Art Archive (albums) — all proxied through a Supabase edge function so API keys stay server-side
- **Granularity:** TV logs per season; music logs per album; 5-star ratings in half steps

## Development

```bash
npm install
npm run dev
```

No Supabase project needed for UI work — visit any page with `?mock=1` for
**mock mode**: a fake signed-in user and an in-memory database seeded with
fixtures (sticky via localStorage, `?mock=0` to leave). The amber `MOCK`
badge marks it.

```bash
npm run lint        # oxlint
npm run build       # typecheck + production build (PWA generated here only)
npm run verify-ui   # Playwright checks, desktop + iPhone 13 (dev server must be running)
```

## Production setup

1. **Supabase project** — create one, then apply the schema and deploy the proxy:
   ```bash
   supabase link --project-ref <ref>
   supabase db push                        # applies supabase/migrations/
   supabase functions deploy metadata
   supabase secrets set TMDB_API_KEY=... RAWG_API_KEY=...
   ```
2. **Google SSO** — create a Google Cloud OAuth client, register Supabase's
   callback URL, paste client ID/secret into Supabase → Auth → Providers → Google.
3. **Client env** — copy `.env.example` to `.env.local` and fill in
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (same vars in Vercel for deploys).

Row-Level Security keeps log entries strictly per-user; media items are a
shared cache of external lookups. No bank of user data leaves your Supabase
project — self-hosting is a planned later cycle (Supabase is OSS).
