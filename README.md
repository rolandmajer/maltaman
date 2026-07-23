# MALTAMAN — Protokol z obhliadky nehnuteľnosti

Mobile-first, installable web application that replaces the paper "Protokol z obhliadky
nehnuteľnosti" used by MALTAMAN's technicians on-site. Built with Next.js 16 (App Router),
TypeScript, Prisma/SQLite, and a Slovak-native PDF export pipeline.

## Quick start

Requirements: Node.js ≥ 20.9 (the app itself is built and tested on Node 24).

```bash
npm install
cp .env.example .env      # then edit AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate        # creates prisma/dev.db and applies the schema
npm run db:seed           # seeds a demo organisation, technician login, and a full demo inspection
npm run dev                # http://localhost:3000
```

Log in with the seeded technician account (see `.env` — defaults to
`technik@maltaman.sk` / `maltaman123`).

### Other scripts

```bash
npm run build          # production build (Turbopack)
npm run start           # run the production build
npm run lint            # ESLint
npm run typecheck       # tsc --noEmit
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright E2E tests (needs the dev server; see below)
npm run db:studio        # Prisma Studio, browse the local SQLite DB
```

Playwright's config reuses an already-running dev server on `localhost:3000` if one exists,
otherwise it starts `npm run dev` itself. The seed script is idempotent for the demo org, but the
E2E suite creates additional inspections as it runs — re-run `npm run db:seed` after `npm run
test:e2e` (or wipe `prisma/dev.db` and re-migrate) if you want a clean demo dataset afterwards.

## Architecture

- **Framework**: Next.js 16 App Router, Turbopack, React 19.2. Route handlers under
  `src/app/api/**` provide a REST-ish JSON API; the wizard UI is entirely client-rendered against
  that API (chosen over Server Actions because the offline-first wizard needs to intercept network
  failures itself and queue retries — a plain `fetch` gives it that control).
- **Data model**: `prisma/schema.prisma` — 20 models covering Organisation/User/AppSettings down to
  the per-room Finding checklist and itemised CostItem estimate. SQLite locally via
  `@prisma/adapter-better-sqlite3` (Prisma 7's driver-adapter pattern); switching to PostgreSQL is a
  datasource + adapter swap, no schema changes (see below).
- **One unifying `Finding` model**: room checklist rows, technical-condition rows, and free-form
  findings are all the same `Finding` record (optionally linked to a `Room` or `InspectionElement`).
  Every checklist prvok is seeded as a `Finding` with status `OK` the moment a room/element is
  created, so "assessed as fine" and "not yet looked at" are never ambiguous, and the findings
  summary (step 5) is just `Finding.status IN (V, R)` — no separate aggregation step.
- **Offline-first editing**: `src/lib/offline/` — an IndexedDB (Dexie) cache of the current
  inspection plus a mutation queue. `src/lib/inspection-context.tsx`'s `applyAndSave` always
  updates local React state immediately (works offline), then attempts the network call; on a
  genuine network failure the mutation is queued and retried on reconnect (`online` event **and**
  a 5s polling backup, since `online` isn't always reliable). See **Known limitations** below for
  what this does *not* cover.
- **PDF**: `src/lib/pdf/` — `@react-pdf/renderer` with the open-licensed Noto Sans font embedded
  from `src/fonts/` (stripped of its GSUB ligature table — see the comment in
  `src/lib/pdf/fonts.ts` for why; it fixed a real character-dropping bug around "fi"/"fl"
  ligatures). Rendered server-side in `GET /api/inspections/[id]/pdf`, streamed directly (no temp
  files).
- **PWA**: `src/app/manifest.ts` + `public/sw.js` (network-first pages with a cache fallback,
  cache-first static assets, API requests always bypass the SW so the offline-queue logic above is
  the single source of truth for offline writes). The service worker registers only in production
  builds (`src/instrumentation-client.ts`) to avoid fighting Turbopack's dev HMR.
- **Auth**: Auth.js v5 (`src/lib/auth.ts`), credentials provider, JWT sessions, org-scoped on every
  query. `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) gates every route except
  `/login` and the auth API.

## Data model overview

```
Organisation ─┬─ User ─┬─ Inspection ─┬─ Property (1:1)
              │        │              ├─ InspectionConditions (1:1)
              └─ AppSettings          │              ├─ Participant[]
                                       ├─ Room[] ─────┼─ Finding[] ─┬─ Measurement[]
                                       │              │             ├─ Photo[]
                                       │              │             └─ CostItem[]
                                       ├─ InspectionCategory[] ─ InspectionElement[] ─ Finding[]
                                       ├─ CostCategory[] ─ CostItem[]
                                       ├─ Recommendation[]
                                       ├─ Signature[]
                                       └─ ReportRevision[]  (+ self-relation for revisions)
```

All IDs are `cuid()`; every mutable entity has `createdAt`/`updatedAt`. Deleting a `Room` cascades
its findings/photos/cost items (the UI confirms before deleting anything non-empty).

### Migrating to PostgreSQL

1. `datasource db { provider = "postgresql" }` in `prisma/schema.prisma`, set `DATABASE_URL` to a
   Postgres connection string.
2. Swap `@prisma/adapter-better-sqlite3` for `@prisma/adapter-pg` in `src/lib/db.ts` (same
   `new PrismaClient({ adapter })` shape — Prisma 7 always requires an explicit driver adapter).
3. `npx prisma migrate dev` to generate Postgres-native migrations. No model changes are required —
   the schema deliberately avoids SQLite-only types.

## Deploying to Fly.io

Vercel/Netlify won't work for this app as-is: both run on an ephemeral, read-only
filesystem, and this app keeps its SQLite database file on local disk. Fly.io supports
persistent volumes on its free allowance, so the database can live on a volume, while
uploaded photos go to **Tigris object storage** (S3-compatible, provisioned by Fly's Tigris
extension). `Dockerfile`, `fly.toml`, and `.dockerignore` in the repo root implement this:

- `Dockerfile` — multi-stage build. `deps` installs dependencies (with build tools, in case
  better-sqlite3/sharp need to compile native bindings for the target platform); `builder`
  runs `prisma generate` and `next build` (using `output: "standalone"` from
  `next.config.ts`, which traces only the files actually needed at runtime); `runner` is the
  slim production image — it also installs the `prisma` CLI locally (not included in the
  standalone trace, since it's a dev-time tool) so `prisma migrate deploy` can run at deploy
  time.
- `fly.toml` — mounts a persistent volume at `/data` and points `DATABASE_URL` at
  `file:/data/dev.db` so the database survives restarts and redeploys. Photo storage is
  backed by Tigris: `src/lib/storage.ts` auto-selects the Tigris (S3) backend when
  `BUCKET_NAME` + `AWS_*` credentials are present (Fly injects them as secrets), and falls
  back to the local filesystem otherwise. `release_command = "prisma migrate deploy"` applies
  pending migrations before each deploy is promoted.

**Important**: a Fly volume is pinned to a single machine, and SQLite is single-writer — do
**not** scale this app beyond 1 machine (don't set `min_machines_running` above 1 or add
`[[services]].concurrency`-based autoscaling that spins up parallel machines). (Photos now
live in Tigris rather than on the volume, but the SQLite database still pins the app to one
machine.)

### First-time setup

```bash
# 1. Install the Fly CLI, then log in
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Claim an app name (edit `app` in fly.toml if "maltaman-app" is taken) and create the volume
fly launch --no-deploy --copy-config
fly volumes create maltaman_data --size 1 --region fra

# 3. Provision a Tigris bucket for photo storage. This sets BUCKET_NAME + AWS_* secrets on
# the app automatically. (Already have one? Skip this — re-running errors if it exists.)
fly ext tigris create

# 4. Set secrets (never commit these — DATABASE_URL/STORAGE_DIR are already in fly.toml
# since they're just paths, not secrets)
fly secrets set AUTH_SECRET="$(openssl rand -base64 32)"

# 5. Deploy
fly deploy
```

`fly deploy` builds the Docker image, runs `prisma migrate deploy` via `release_command`
(creating `/data/dev.db` on first run), then starts the app. Seeding is intentionally
**not** automatic in production, since the seed script creates a technician account with a
known demo password — if you want the demo data, run it manually once against the deployed
volume:

```bash
fly ssh console -C "npx tsx prisma/seed.ts"
```

Subsequent deploys are just `fly deploy` again; migrations and data on the volume persist.

## Testing

- **Unit** (`src/**/*.test.ts(x)`, Vitest): cost/VAT/contingency math, step-completion logic,
  finalisation-validation logic, Slovak locale formatting, and PDF generation (renders the seeded
  inspection and asserts on extracted text — full Slovak diacritic set present, and a regression
  test for the fi-ligature bug).
- **E2E** (`e2e/*.spec.ts`, Playwright): create inspection → add multiple bedrooms → duplicate/
  delete a room → checklist status persists across reload → create a cost item from a finding and
  verify its VAT math → contingency recalculates the total → finalisation is blocked until required
  fields are met, then succeeds → PDF export returns a real `application/pdf` → an edit made while
  offline is queued, survives the current session, and reaches the server once reconnected → photo
  upload appears in the grid.

Both suites are green (33 unit / 12 E2E) and were run against a real SQLite database and a real
running dev server throughout — not mocked. Writing the E2E suite surfaced (and this fixed) three
real bugs that unit tests alone wouldn't have caught: an empty-date field silently blocking
autosave for an entire form, an empty-string validation rule blocking signature creation, and
several `<label>` elements not associated with their `<input>` (a real WCAG gap, not just a test
inconvenience).

## Known limitations & assumptions

Being upfront about what's genuinely complete vs. where corners were knowingly cut, as requested:

- **Offline record *creation*, not just editing.** Editing an already-open inspection works fully
  offline (optimistic local state + IndexedDB cache + mutation queue). Starting a **brand new**
  inspection still requires one connectivity moment, because the protocol number is assigned
  server-side under a uniqueness constraint. Common field-service pattern: create the draft while
  you still have signal (e.g. in the car), then go fully offline once inside the property.
- **Offline queue has no conflict resolution.** It's last-write-wins, single-technician-at-a-time.
  A genuinely *permanent* failure replayed from the queue (not a transient network error) will
  retry indefinitely with no user-facing way to discard it — acceptable for the local-SQLite,
  single-device use case this was built for, not for concurrent multi-device editing of the same
  inspection.
- **Multi-tenant auth is structural, not fully built out.** Every query is organisation-scoped and
  the schema supports multiple users/orgs, but there's no signup/invite flow — the seed script
  creates the one technician account. Adding user management is additive, not a rearchitecture.
- **Photo markup is tap-to-annotate, not freehand.** Circles (single tap) and arrows (two taps) with
  a short text label, composited into the PDF as vector overlays. No freehand drawing or highlighter
  tool.
- **Room/cost-category presets are fixed constants** (`src/lib/constants.ts`), not editable in
  Settings, except for cost categories which *are* editable there and seed new inspections from
  that list. Room-type presets follow the spec's fixed list; making them settings-editable too would
  be a small, contained follow-up.
- **GPS on photos** is schema-ready (`Photo.gpsLat/gpsLng`, `AppSettings.gpsCaptureEnabled`) but the
  capture UI doesn't yet request device location — wiring the browser Geolocation API behind the
  settings toggle is the remaining piece.
- **Accessibility**: labels, keyboard navigation, and status-never-color-alone were treated as
  first-class (see the E2E-driven label-association fixes above), but a full formal WCAG 2.2 AA
  audit (contrast ratios across every state, screen-reader pass with a real AT) hasn't been done.
- **Seed photos are generated placeholders** (solid-colour JPEGs with a caption baked in via SVG),
  not real site photographs — there were none to attach.

## Deliverables checklist

- [x] Source code (this repository)
- [x] `prisma/schema.prisma` + migrations (`prisma/migrations/`)
- [x] Seed data (`prisma/seed.ts` — realistic demo inspection: living room, 3 bedrooms, kitchen,
      bathroom, separate WC, hallway, balcony, 10+ mixed-severity findings, 16 cost items, 6 photos)
- [x] `.env.example`
- [x] This README (setup, architecture, assumptions/limitations)
- [x] Test suite (Vitest + Playwright, both passing)
- [x] Example generated PDF — run `npm run db:seed` then open any inspection's "Kontrola a export"
      step and click "Náhľad PDF", or `GET /api/inspections/:id/pdf` directly once logged in.
