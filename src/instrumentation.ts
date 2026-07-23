// Next.js server startup hook. Runs once when the app server boots — inside the app Machine,
// which has the /data volume mounted — so it can safely touch the real database. We use it to
// bootstrap the admin login from ADMIN_* secrets (the release_command machine can't, since it
// has no volume). Migrations have already been applied by scripts/start.sh before the server
// starts, so the tables exist by the time this runs.

export async function register() {
  // Only in the Node.js server runtime (skip the edge runtime).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { bootstrapAdmin } = await import("@/lib/bootstrap-admin");
    await bootstrapAdmin();
  } catch (error) {
    // Never let a bootstrap problem stop the server from coming up.
    console.error("[admin-bootstrap] failed:", error);
  }
}
