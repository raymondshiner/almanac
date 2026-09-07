# almanac

> Planning doc. Edit before shipping Cycle 1. Cycles ship as feature branches → PRs.

## Vision

Almanac is a personal, unified media log — one place to record, rate, and review everything consumed across **Film & TV, Games, Books, and Music**, replacing the Letterboxd/Backloggd/Goodreads/RYM constellation with a single self-owned app. Open-source and self-hostable by design; built first on the validated cloud stack for speed, with a Docker self-host path kept open (Supabase is OSS). Single user in practice, but auth-complete from day one. The core loop: search a title → it resolves against the right metadata source with real artwork → log it with a date, rating, and optional review.

## Non-goals

Things we are explicitly NOT building (prevents scope creep):
- Social features — no follows, no comments, no activity feeds. This is a private log.
- AI features (recommendations, taste analysis) — deferred indefinitely, revisit post-C3.
- Native mobile — PWA only, per house rules.
- Automatic tracking/scrobbling (Trakt sync, Spotify listen history, Steam playtime) — manual logging first; import/sync is a later cycle.
- Being a *catalog manager* for owned files (no Jellyfin/Plex overlap) — this logs consumption, not possession.
- montressor/desktop integration — deferred.

## Stack

Defaults from `~/src/CLAUDE.md` (Vite + React 19 + TS strict, Tailwind v4, shadcn/ui Radix Nova, Vercel) unless noted below.
- Build: Vite + React 19 + TS strict
- UI: Tailwind v4 + shadcn/ui (Radix Nova), Geist + JetBrains Mono
- Data: Supabase (Postgres + RLS), Supabase Auth (Google SSO)
- Hosting: Vercel, installable PWA (plugin gated to `build`, per SOLUTIONS.md)
- Metadata proxying: **Supabase Edge Functions** front all external APIs — keys stay server-side, one place for rate limits/CORS
- Metadata sources (one per type, C1):
  - Film & TV → **TMDB**
  - Games → **IGDB** (Twitch client-credentials OAuth — token fetch/refresh lives in the edge function, so client code never sees it. RAWG rejected 2026-09-06: unmaintained, auth broken, API unreliable)
  - Books → **OpenLibrary** (no key)
  - Music → **MusicBrainz + Cover Art Archive** (no key, 1 req/s etiquette — throttle in the edge function)
- Overrides / reasons: none — validated stack applies; self-hosting is a later cycle, not a stack override.

## Data model (sketch)

```
media_items                        log_entries
├── id                             ├── id
├── media_type  (film|tv_show|     ├── item_id → media_items
│    tv_season|game|book|album)    ├── user_id (RLS)
├── parent_id → media_items        ├── logged_at (date consumed)
│    (tv_season → its tv_show)     ├── rating (numeric 0.5–5.0, half steps)
├── external_source + ext_id       ├── review (text, optional)
├── title / year / creator         └── status (done|in-progress|abandoned)
├── cover_url
└── metadata (jsonb, raw)
```

One shared shape for all media types; type-specific detail lives in `metadata` jsonb. TV logs at **season** granularity — seasons are items with `parent_id` pointing at their show, so show pages aggregate season logs. Music logs at **album** granularity. Rating is stored numeric so a future rescale stays cheap. Items are cached copies of external lookups — the log entry is the real user data.

## Cycles

Each cycle is one batch of cohesive functionality, shipped together on a feature branch.

### Cycle 1 — MVP
**Theme:** Log anything — search, resolve, rate, done.

**Done when:**
- [ ] Google SSO in, RLS on, my data is mine
- [ ] Unified search box resolves titles per media type (TMDB / IGDB / OpenLibrary / MusicBrainz) with artwork
- [ ] Can log any result: date, rating, optional review, status
- [ ] A diary view lists everything logged, newest first, filterable by media type
- [ ] An item detail page shows the artwork, metadata, and my log history for it
- [ ] Edit/delete my own log entries
- [ ] Installable PWA, verify-ui passing on desktop + iPhone 13 viewports

**Scope:**
- All four media types, shallow — same log flow everywhere
- Edge-function proxy layer for the four APIs
- 5-star half-step ratings; TV per-season (TMDB season endpoints); music albums-only

**Out of scope for this cycle (deferred to later):**
- Lists/backlog/wishlist, stats, imports, rewatch chains, tags

### Cycle 2 — Backlog & lists
**Done when:**
- [ ] "Want to" status + backlog view per media type
- [ ] Custom lists (ordered, cross-media)
- [ ] Rewatch/replay/reread supported cleanly (multiple entries per item, history on detail page)

**Scope:**
- Status model expansion, list CRUD, list detail pages

### Cycle 3 — Stats & year in review
- Per-year and all-time stats: counts by type, rating distributions, monthly cadence
- "Year in review" page (the Letterboxd-stats itch)

### Cycle 4 — Import
- CSV importers: Letterboxd, Goodreads, Backloggd exports → media items + log entries

### Cycle 5 — Self-host path
- Docker Compose: app + self-hosted Supabase; document the migration off cloud

### Cycle 6+ — backlog
- IGDB swap-in (richer game data), Trakt/Spotify sync, tags, AI features, montressor integration

## Decisions (settled 2026-07-16)

- **Rating scale:** 5 stars with half steps (0.5–5.0), stored numeric.
- **Music granularity:** albums only in C1.
- **TV granularity:** per-season from day one (`tv_season` items, `parent_id` → show).
- **Repo:** public from the first commit — `raymondshiner/almanac`.

## Open questions

- (none — revisit at Cycle 2 planning)

## Risks / unknowns

- **Four external APIs in one cycle** is the fattest risk — mitigated by the shared edge-function proxy and shallow per-type scope; if one source fights back (likely MusicBrainz throttling or IGDB token handling), stub it to manual entry and ship.
- MusicBrainz 1 req/s limit needs debounced search + server-side throttle or search feels broken.
- Unified `media_items` shape may pinch when a type needs depth (game platforms/editions, track-level music) — `parent_id` + jsonb buy room, but C2+ may force type tables.
- "Almanac" name collides with almanac.io (docs startup) — irrelevant for a self-hosted personal app, revisit only if this ever goes public-product.

---
*Created 2026-07-16. Private ops log: `~/jarvis/claude/project-logs/almanac/log.md`*
