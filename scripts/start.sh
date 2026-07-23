#!/bin/sh
# Container entrypoint, run in the app Machine — which has the /data volume mounted, unlike
# Fly's release_command machine, which does not. Apply pending migrations to the real database
# on the volume, then start the server. The first admin login is created inside the running
# server via GET /api/bootstrap-admin (see src/lib/bootstrap-admin.ts).
set -e
echo "[start] applying migrations..."
prisma migrate deploy
echo "[start] starting server..."
exec node server.js
