# almanac

> Planning doc. Replanned 2026-09-06 (v2 — self-host pivot). Cycles ship as feature branches → PRs.

## Vision

Almanac is a self-hostable, unified media log — record, rate, and review everything consumed across **Film & TV, Games, Books, and Music**, replacing the Letterboxd/Backloggd/Goodreads/RYM constellation with a single self-owned app.

Two-audience product:

1. **Visitors** get a public, read-only site — the diary, item pages, lists, stats — everything the owner has chosen to share, server-rendered with real SEO and OG unfurls.
2. **The admin** (site owner) logs in at `/admin` to log media, edit entries, and manage the site.

And it's **built to be given away**: a premier portfolio project others download and run on their own servers. One Docker container, SQLite inside, an interactive installer that asks for the handful of keys it needs, and you have your own almanac at your own domain. Our own instance runs on tower at `almanac.sirlexicon.com` — the dogfood deployment and the reference install.

The core loop: search a title → it resolves against the right metadata source with real artwork → log it with a date, rating, and optional review → the world sees it (unless marked private).

## Non-goals

- Social features — no follows, no comments, no activity feeds, no multi-user accounts. One admin per instance; visitors read.
- SaaS / hosted-for-you offering — you run your own. (Keeps us out of accounts, billing, moderation.)
- AI features — deferred indefinitely.
- Native mobile — web only. (PWA demoted from house-rule requirement to best-effort backlog — see Decisions.)
- Automatic tracking/scrobbling (Trakt sync, Spotify history, Steam playtime) — manual logging first; import/sync is a later cycle.
- Catalog manager for owned files (no Jellyfin/Plex overlap) — logs consumption, not possession.

## Stack (v2 — overrides house defaults, reasons below)

- **Framework:** Next.js (App Router, React 19, TS strict), `output: 'standalone'` — one Node process serves public SSR pages, `/admin`, and API routes.
- **UI:** Tailwind v4 + shadcn/ui (Radix Nova), Geist + JetBrains Mono — carried over from v1; components port as-is.
- **Data:** **SQLite + Drizzle ORM**, DB file on a mounted volume. Backup = copy one file.
- **Auth:** own session auth — single admin credential, argon2 hash, HTTP-only session cookie. No third-party IdP.
- **Metadata proxying:** Next route handlers replace Supabase Edge Functions — TMDB / IGDB / OpenLibrary / MusicBrainz keys live in server env, never shipped to the client.
- Metadata sources (one per type):
  - Film & TV → **TMDB**
  - Games → **IGDB** (Twitch client-credentials OAuth — token fetch/refresh in the server proxy. RAWG rejected 2026-09-06: unmaintained, auth broken, API unreliable)
  - Books → **OpenLibrary** (no key)
  - Music → **MusicBrainz + Cover Art Archive** (no key, 1 req/s etiquette — throttle server-side)
- **Delivery:** Docker image (ghcr.io) + `docker-compose.yml` + interactive `install.sh`. Reference deploy: tower + Cloudflare Tunnel.

**Overrides / reasons** (deviating from `~/src/CLAUDE.md` + SOLUTIONS.md hard defaults, per two-lane doctrine and the self-host mandate):
- *Vite → Next:* public content site is the product's front door — SSR/OG/SEO litmus all hit; straddler (public front + gated admin) → Next lane.
- *Supabase → SQLite + own auth:* the distributable IS the product. Self-hosted Supabase is a ~10-container stack and Google SSO forces every adopter to configure their own OAuth app — both kill installer UX. Single-admin credential + one-file DB is the genre standard (Jellyfin, Audiobookshelf, linkding).
- *PWA → best-effort:* `vite-plugin-pwa` doesn't exist on this lane; serwist is unproven per house notes. Not worth blocking the pivot.

## Data model (carried from v1, ported to Drizzle/SQLite)

```
media_items                        log_entries
├── id                             ├── id
├── media_type  (film|tv_show|     ├── item_id → media_items
│    tv_season|game|book|album)    ├── logged_at (date consumed)
├── parent_id → media_items        ├── rating (numeric 0.5–5.0, half steps)
│    (tv_season → its tv_show)     ├── review (text, optional)
├── external_source + ext_id       ├── status (done|in-progress|abandoned)
├── title / year / creator         └── is_private (hidden from public views)
├── cover_url
└── metadata (JSON text, raw)      site_config (title, owner name, bio, …)
```

`user_id`/RLS gone — single admin owns all writes; visibility is per-entry via `is_private`. TV logs at season granularity (`parent_id` → show); music at album granularity. Items are cached copies of external lookups — log entries are the real data.

## Cycles

### Cycle 1 — MVP prototype ✅ (built on v1 stack, unmerged)
Validated the product: unified search, log/rate/review across all types, diary, item detail — on Vite + Supabase. Treat as reference implementation; superseded by the pivot. Branch `feature/cycle-1` stays as the archive.

### Cycle 2 — Platform pivot
**Theme:** same app, new bones — public/admin split on the self-host architecture.

**Done when:**
- [ ] Next.js App Router scaffold, standalone output; SQLite + Drizzle schema + migrations
- [ ] Admin session auth (argon2 + cookie); credential seeded from env/installer
- [ ] All v1 features ported: unified search (metadata proxy as route handlers, IGDB token dance included), log/edit/delete with date/rating/review/status, diary with filters, item detail
- [ ] Public read-only routes (SSR): home/diary, item pages — `is_private` entries invisible without a session
- [ ] `/admin` gated: all write paths reject without session, verified by test
- [ ] OG tags on public pages (unfurl a diary/item link and it looks right)
- [ ] verify-ui passing desktop + iPhone 13 viewports
- [ ] `.project.json` devCommand updated for Next

### Cycle 3 — Packaging & installer
**Theme:** someone who isn't us runs it in 10 minutes.

**Done when:**
- [ ] Dockerfile (standalone build) + `docker-compose.yml` (app + volume)
- [ ] Image published to ghcr.io via GitHub Actions on tagged release
- [ ] Interactive `install.sh`: prompts for admin user/pass, site title, domain, TMDB key, Twitch client id/secret → writes `.env`, pulls, starts
- [ ] First-run works with zero manual DB steps (migrations auto-apply on boot)
- [ ] README: quickstart, key-acquisition walkthrough (TMDB + Twitch dev portal), upgrade + backup docs
- [ ] LICENSE chosen and committed

### Cycle 4 — Tower deploy (reference install)
**Done when:**
- [ ] Running on tower via the Cycle 3 installer — no snowflake steps; friction found → fix the installer, not the box
- [ ] `almanac.sirlexicon.com` live via Cloudflare Tunnel (cloudflared on tower)
- [ ] Nightly SQLite backup on tower (cron copy or litestream), restore tested once
- [ ] Runbook in `~/jarvis/claude/homelab/` (service, tunnel, backup, upgrade)
- [ ] Daily-driver dogfooding starts — Letterboxd et al. retired

### Cycle 5 — Backlog & lists
- "Want to" status + backlog view per type; custom ordered cross-media lists; rewatch/replay chains (multiple entries per item, history on detail page). Public unless private.

### Cycle 6 — Stats & year in review
- Per-year and all-time stats: counts by type, rating distributions, monthly cadence; public "year in review" page (the Letterboxd-stats itch — now shareable).

### Cycle 7 — Import
- CSV importers: Letterboxd, Goodreads, Backloggd exports → items + entries.

### Cycle 8+ — backlog
- Best-effort PWA (serwist), image caching/self-hosted covers, optional Postgres driver, multi-admin, Trakt/Spotify sync, tags, theming for self-hosters.

## Decisions

- **2026-07-16:** 5-star half-step ratings, stored numeric · music = albums only · TV per-season from day one · repo public from first commit (`raymondshiner/almanac`).
- **2026-09-06 — games source = IGDB**, RAWG rejected (unmaintained, auth broken).
- **2026-09-06 — self-contained pivot:** Next.js standalone + SQLite/Drizzle + own single-admin session auth, one Docker container. Supersedes Vite/Supabase/Google-SSO. The distributable is the product.
- **2026-09-06 — visibility model:** public by default, per-entry `is_private` flag. No public/private split at the account level — one knob, on the entry.
- **2026-09-06 — SQLite over Postgres:** single-admin write volume; one-file backup; genre precedent. Optional Postgres driver is backlog, not scope.
- **2026-09-06 — Vercel retired as target.** Deploy target is "any Docker host"; ours is tower.

## Open questions

- **License** — MIT (max adoption) vs AGPL (forks stay open)? Decide by Cycle 3; leaning MIT for portfolio reach.
- Site config (title/bio/owner) — installer-set env vs editable in `/admin`? Leaning DB + admin UI, env-seeded.
- Cover art: hotlink external CDNs (TMDB attribution required) vs cache locally? Hotlink for C2, revisit at C8 (self-hosters may want full independence).

## Risks / unknowns

- **The port itself** — ~3.2k lines move from SPA+Supabase to App Router+Drizzle; RSC serialization-wall and `"use client"` boundary gotchas (house notes) are the likely time sinks. Mitigation: components/UI port near-verbatim; only the data layer is rewritten.
- **IGDB token handling** — client-credentials expiry/refresh in the proxy; stub games to manual entry if it fights back (same escape hatch as v1).
- MusicBrainz 1 req/s — debounced search + server-side throttle or search feels broken.
- **Installer bitrot** — install scripts rot silently. Mitigation: tower (C4) must use the public path; CI smoke-builds the Docker image every release.
- Unified `media_items` shape may pinch when a type needs depth — `parent_id` + JSON column buy room; C5+ may force type tables.
- "Almanac" name collides with almanac.io — now mildly relevant (public product). Ship as `raymondshiner/almanac`; revisit only if it ever matters.

---
*Created 2026-07-16 · replanned 2026-09-06 (v2). Private ops log: `~/jarvis/claude/project-logs/almanac/log.md`*
