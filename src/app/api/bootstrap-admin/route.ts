import { NextResponse } from "next/server";
import { bootstrapAdmin } from "@/lib/bootstrap-admin";

// One-time first-login setup. Public (see the allowlist in src/lib/auth.ts) because it must be
// reachable before any account exists — but it is safe: it only ever creates/updates the account
// defined by the server's own ADMIN_* secrets (never anything from the request), and it no-ops
// once that account exists (unless ADMIN_FORCE_RESET is set). Once you've logged in, remove the
// ADMIN_* secrets and this route goes inert.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await bootstrapAdmin();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
