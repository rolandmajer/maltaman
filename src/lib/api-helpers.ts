import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";

export { ApiError };

/** Resolves the current session's user, throwing a 401 ApiError if unauthenticated. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Neautorizovaný prístup");
  return session.user;
}

/** Loads an inspection and verifies it belongs to the caller's organisation (multi-tenant isolation). */
export async function requireInspectionAccess(inspectionId: string, organisationId: string) {
  const inspection = await db.inspection.findUnique({ where: { id: inspectionId } });
  if (!inspection || inspection.organisationId !== organisationId) {
    throw new ApiError(404, "Obhliadka nebola nájdená");
  }
  return inspection;
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Neplatné dáta", issues: error.issues }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Interná chyba servera" }, { status: 500 });
}

export async function withApi<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
