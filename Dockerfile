# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps: install dependencies (kept in its own layer so `npm ci` is only
# re-run when package.json/package-lock.json change, not on every source edit)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# build-essential + python3 back better-sqlite3/sharp's native builds in case a
# prebuilt binary isn't available for the target platform (e.g. linux/arm64).
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# builder: generate the Prisma client and produce the Next.js standalone build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# runner: minimal production image
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Put the locally-installed Prisma CLI (below) on PATH so fly.toml's bare
# `release_command = "prisma migrate deploy"` resolves it.
ENV PATH="/app/node_modules/.bin:${PATH}"

# The Prisma CLI (not bundled by `output: standalone`, which only traces runtime
# code) is needed at deploy time to run `prisma migrate deploy` — see fly.toml's
# `release_command`. Install it *locally* into /app (not globally): under Prisma 7
# the CLI loads `prisma.config.ts`, whose `prisma/config` and `dotenv/config`
# imports must resolve from /app's node_modules — a global install is invisible to
# that resolution. Installed before the standalone copy below so Docker's COPY
# merges the traced runtime node_modules on top without npm pruning either set.
# `dotenv` backs prisma.config.ts's `import "dotenv/config"`; on Fly the real env
# vars are injected by the platform, so it simply finds no .env and moves on.
# `tsx` + `bcryptjs` let the release command's `scripts/create-admin.ts` run inside the image
# to bootstrap the first login — the app has no public sign-up and seeding is skipped in
# production. bcryptjs is otherwise only bundled into the Next server chunks, so it must be
# installed here too. Versions pinned to match package.json.
RUN npm install --no-save prisma@7.9.0 dotenv@17.4.2 tsx@4.23.1 bcryptjs@3.0.3

# `node:22` images already ship a non-root `node` user (uid 1000) — reuse it
# instead of creating a new one.
RUN mkdir -p /data && chown -R node:node /app /data

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma
# prisma.config.ts lives at the repo root, so it isn't part of /app/prisma above;
# the CLI needs it alongside the schema to know the datasource URL for migrations.
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
# Release-command scripts (migrations + admin bootstrap). create-admin.ts imports the generated
# Prisma client from .next/standalone's src/generated/prisma, already copied above.
COPY --from=builder --chown=node:node /app/scripts ./scripts

USER node
EXPOSE 3000

CMD ["node", "server.js"]
