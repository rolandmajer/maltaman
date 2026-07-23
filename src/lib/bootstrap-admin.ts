import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function truthy(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value ?? "").trim());
}

/**
 * Ensures an admin login exists, driven by ADMIN_* environment variables. Runs at server
 * startup (see src/instrumentation.ts) inside the app process — which, unlike Fly's
 * release_command machine, has the /data volume mounted, so it writes to the real database.
 *
 * The app has no public sign-up and seeding is skipped in production, so this is how the first
 * login is created:
 *   ADMIN_EMAIL         (required) — login e-mail, stored exactly as given
 *   ADMIN_PASSWORD      (required) — at least 8 characters
 *   ADMIN_NAME          (optional) — display name, defaults to "Administrátor"
 *   ADMIN_ORG_NAME      (optional) — organisation name if none exists yet, defaults to "MALTAMAN"
 *   ADMIN_FORCE_RESET   (optional) — "true"/"1" to reset an existing account's password
 *
 * Safe to run on every boot:
 *   • secrets unset          → no-op
 *   • account does not exist  → created
 *   • account already exists  → left untouched, unless ADMIN_FORCE_RESET is set (so an in-app
 *                               password change is not overwritten on the next restart)
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrátor";
  const orgName = process.env.ADMIN_ORG_NAME?.trim() || "MALTAMAN";
  const forceReset = truthy(process.env.ADMIN_FORCE_RESET);

  if (!email && !password) return; // not configured — nothing to do
  if (!email || !password) {
    console.warn("[admin-bootstrap] only one of ADMIN_EMAIL/ADMIN_PASSWORD is set — skipping (both required).");
    return;
  }
  if (password.length < 8) {
    console.warn("[admin-bootstrap] ADMIN_PASSWORD is shorter than 8 characters — skipping.");
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && !forceReset) return; // already bootstrapped; don't clobber the password

  const passwordHash = await bcrypt.hash(password, 10);

  // Keep an existing user in their current organisation; otherwise reuse the first one or create it.
  let organisationId: string;
  if (existing) {
    organisationId = existing.organisationId;
  } else {
    const org =
      (await db.organisation.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await db.organisation.create({ data: { name: orgName } }));
    organisationId = org.id;
    // The app expects each organisation to have a settings row; create one if missing.
    await db.appSettings.upsert({ where: { organisationId }, update: {}, create: { organisationId } });
  }

  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", name },
    create: { email, passwordHash, role: "ADMIN", name, organisationId },
  });

  console.log(
    existing
      ? `[admin-bootstrap] reset password for ${user.email} (role ${user.role}).`
      : `[admin-bootstrap] created ${user.email} (role ${user.role}).`,
  );
}
