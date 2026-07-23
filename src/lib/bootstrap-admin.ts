import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function truthy(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value ?? "").trim());
}

export type BootstrapResult = {
  status: "created" | "reset" | "exists" | "skipped";
  message: string;
};

// Runs bootstrapAdmin() at most once per server process (per cold start), swallowing errors so
// it can never break page rendering. Called when the /login page loads so the first admin is
// created automatically the moment someone opens the app — no special URL needed. A "skipped"
// result (secrets not set yet) or a failure is not cached, so a later load retries.
let bootstrapOnce: Promise<void> | null = null;
export function ensureAdminBootstrapped(): Promise<void> {
  if (!bootstrapOnce) {
    bootstrapOnce = (async () => {
      try {
        const result = await bootstrapAdmin();
        console.log(`[admin-bootstrap] ${result.status}: ${result.message}`);
        if (result.status === "skipped") bootstrapOnce = null; // retry once secrets appear
      } catch (error) {
        console.error("[admin-bootstrap] failed:", error);
        bootstrapOnce = null; // allow a later attempt
      }
    })();
  }
  return bootstrapOnce;
}

/**
 * Ensures an admin login exists, driven by ADMIN_* environment variables. Runs inside the app
 * server (via GET /api/bootstrap-admin) — using the app's own working Prisma client and the
 * mounted volume database — because the app has no public sign-up and seeding is skipped in
 * production. It reads credentials only from server-side env, never from the request, so it
 * cannot be used to inject an attacker-controlled account:
 *
 *   ADMIN_EMAIL         (required) — login e-mail, stored exactly as given
 *   ADMIN_PASSWORD      (required) — at least 8 characters
 *   ADMIN_NAME          (optional) — display name, defaults to "Administrátor"
 *   ADMIN_ORG_NAME      (optional) — organisation name if none exists yet, defaults to "MALTAMAN"
 *   ADMIN_FORCE_RESET   (optional) — "true"/"1" to reset an existing account's password
 *
 * - secrets unset          → skipped
 * - account does not exist  → created
 * - account already exists  → left untouched unless ADMIN_FORCE_RESET is set
 */
export async function bootstrapAdmin(): Promise<BootstrapResult> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrátor";
  const orgName = process.env.ADMIN_ORG_NAME?.trim() || "MALTAMAN";
  const forceReset = truthy(process.env.ADMIN_FORCE_RESET);

  if (!email || !password) {
    return { status: "skipped", message: "ADMIN_EMAIL/ADMIN_PASSWORD not set — nothing to do." };
  }
  if (password.length < 8) {
    return { status: "skipped", message: "ADMIN_PASSWORD must be at least 8 characters." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && !forceReset) {
    return { status: "exists", message: `Admin ${email} already exists. Set ADMIN_FORCE_RESET=true to reset its password.` };
  }

  const passwordHash = await bcrypt.hash(password, 10);

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

  return existing
    ? { status: "reset", message: `Password reset for ${user.email} (role ${user.role}). You can log in now.` }
    : { status: "created", message: `Created ${user.email} (role ${user.role}). You can log in now.` };
}
