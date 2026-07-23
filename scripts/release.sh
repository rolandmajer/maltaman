#!/bin/sh
# Release command run by Fly.io before each deploy is promoted (see fly.toml's [deploy]).
# 1. Apply pending migrations — critical, so a failure here aborts the deploy (set -e).
# 2. Bootstrap the admin account from ADMIN_* secrets if configured — best-effort, so it
#    never blocks a deploy (the script itself no-ops when the secrets are absent).
set -e
prisma migrate deploy
set +e
tsx scripts/create-admin.ts || echo "create-admin: non-fatal error, continuing deploy."
exit 0
