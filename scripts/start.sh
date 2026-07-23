#!/bin/sh
# Container entrypoint, run in the app Machine — which has the /data volume mounted, unlike
# Fly's release_command machine, which does not. So database work must happen here, at startup:
#   1. Apply pending migrations against the real database on the volume.
#   2. Start the server. The admin-login bootstrap then runs inside it (src/instrumentation.ts),
#      after these migrations have created the tables.
set -e
prisma migrate deploy
exec node server.js
