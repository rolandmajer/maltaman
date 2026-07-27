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

# Prisma's CLI (not bundled by `output: standalone`, which only traces runtime
# code) is needed at deploy time to run `prisma migrate deploy` — see fly.toml's
# `release_command`. Version pinned to match package.json's devDependency.
RUN npm install --global prisma@7.9.0

# prisma.config.ts imports "dotenv/config" and "prisma/config" — devDependencies Next's
# standalone trace doesn't bundle (it only traces the app's own runtime code). The global
# `prisma` install above puts the CLI binary on PATH, but Node still resolves prisma.config.ts's
# own bare-specifier imports relative to /app/node_modules, not the global npm prefix — so both
# packages also need a local (non-global, no-save) install here for the config file to load.
# No .env exists in this image; dotenv is a no-op here since Fly injects env vars/secrets
# directly — this only satisfies the import.
RUN npm install --no-save prisma@7.9.0 dotenv@^17.4.2

# `node:22` images already ship a non-root `node` user (uid 1000) — reuse it
# instead of creating a new one.
RUN mkdir -p /data && chown -R node:node /app /data

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 3000

CMD ["node", "server.js"]
