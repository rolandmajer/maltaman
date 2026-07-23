// Ensures an admin login exists, driven by ADMIN_* env vars. Run at container startup by
// scripts/start.sh — inside the app Machine, which has the /data volume mounted (Fly's
// release_command machine does not), so it writes to the real database. Self-contained
// (imports the generated client by relative path + its driver adapter) so it runs under a plain
// `tsx` without needing the app's "@/..." path alias. Prints diagnostics so the deploy Logs show
// exactly what happened.
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
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  console.log(
    `[admin] DATABASE_URL=${url} | ADMIN_EMAIL=${email ? "set" : "MISSING"} | ` +
      `ADMIN_PASSWORD=${password ? "set" : "MISSING"} | ADMIN_FORCE_RESET=${forceReset}`,
  );
  if (!email || !password) {
    console.log("[admin] ADMIN_EMAIL/ADMIN_PASSWORD not both set — skipping.");
    return;
  }
  if (password.length < 8) {
    console.log("[admin] ADMIN_PASSWORD shorter than 8 characters — skipping.");
    return;
  }

  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    const existing = await db.user.findUnique({ where: { email } });
    console.log(`[admin] existing account for ${email}: ${existing ? "yes" : "no"} | total users: ${await db.user.count()}`);

    if (existing && !forceReset) {
      console.log(`[admin] ${email} already exists — leaving password unchanged (set ADMIN_FORCE_RESET=true to reset).`);
      return;
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
      await db.appSettings.upsert({ where: { organisationId }, update: {}, create: { organisationId } });
    }

    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash, role: "ADMIN", name },
      create: { email, passwordHash, role: "ADMIN", name, organisationId },
    });
    console.log(`[admin] ${existing ? "reset password for" : "created"} ${user.email} (role ${user.role}). You can log in now.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("[admin] failed:", error);
  process.exit(1);
});
