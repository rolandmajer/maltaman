// Bootstraps (or resets) an admin account. The app has no public sign-up and seeding is
// skipped in production, so this is how the first login is created. It runs automatically as
// part of the deploy release command (see scripts/release.sh + fly.toml) and can also be run
// by hand: `fly ssh console -C "tsx scripts/create-admin.ts"`.
//
// Credentials come from the environment so they never end up in git — on Fly, set them as
// secrets from the dashboard or CLI:
//
//   ADMIN_EMAIL         (required) — the login e-mail, stored exactly as given
//   ADMIN_PASSWORD      (required) — at least 8 characters
//   ADMIN_NAME          (optional) — display name, defaults to "Administrátor"
//   ADMIN_ORG_NAME      (optional) — organisation name if none exists yet, defaults to "MALTAMAN"
//   ADMIN_FORCE_RESET   (optional) — set to "true"/"1" to reset the password of an account that
//                                    already exists (otherwise an existing account is left alone)
//
// Behaviour is designed to be safe to run on every deploy:
//   • secrets unset            → skip, exit 0 (a normal deploy)
//   • account does not exist   → create it with the given password
//   • account already exists   → leave it untouched, UNLESS ADMIN_FORCE_RESET is set
//
// This means a password you later change inside the app is not overwritten by the next deploy.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

function truthy(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((value ?? "").trim());
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrátor";
  const orgName = process.env.ADMIN_ORG_NAME?.trim() || "MALTAMAN";
  const forceReset = truthy(process.env.ADMIN_FORCE_RESET);

  // Not configured — nothing to do. Safe no-op for ordinary deploys.
  if (!email && !password) {
    console.log("create-admin: ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }
  if (!email || !password) {
    console.warn("create-admin: only one of ADMIN_EMAIL/ADMIN_PASSWORD is set — skipping (both are required).");
    return;
  }
  if (password.length < 8) {
    console.warn("create-admin: ADMIN_PASSWORD is shorter than 8 characters — skipping.");
    return;
  }

  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  try {
    const existing = await db.user.findUnique({ where: { email } });

    if (existing && !forceReset) {
      console.log(
        `create-admin: ${email} already exists — leaving it unchanged ` +
          "(set ADMIN_FORCE_RESET=true to reset its password).",
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Keep an existing user in their current organisation; otherwise reuse the first
    // organisation or create one.
    let organisationId: string;
    if (existing) {
      organisationId = existing.organisationId;
    } else {
      const org =
        (await db.organisation.findFirst({ orderBy: { createdAt: "asc" } })) ??
        (await db.organisation.create({ data: { name: orgName } }));
      organisationId = org.id;
      // The app expects each organisation to have a settings row; create one if missing.
      await db.appSettings.upsert({
        where: { organisationId },
        update: {},
        create: { organisationId },
      });
    }

    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, role: "ADMIN", name },
      create: { email, passwordHash, role: "ADMIN", name, organisationId },
    });

    console.log(
      existing
        ? `create-admin: reset password for ${user.email} (role ${user.role}).`
        : `create-admin: created ${user.email} (role ${user.role}).`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("create-admin failed:", error);
  process.exit(1);
});
