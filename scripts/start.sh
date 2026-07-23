#!/bin/sh
# Container entrypoint, run in the app Machine — which has the /data volume mounted, unlike
# Fly's release_command machine, which does not. So all database work happens here, at startup:
#   1. Apply pending migrations to the real database on the volume.
#   2. Bootstrap the admin login from ADMIN_* secrets (non-fatal — never blocks the server).
#   3. Start the server.
set -e
echo "[start] applying migrations..."
prisma migrate deploy
echo "[start] bootstrapping admin login..."
tsx scripts/bootstrap-admin.ts || echo "[start] admin bootstrap step failed (non-fatal) — continuing."
echo "[start] starting server..."
exec node server.js
