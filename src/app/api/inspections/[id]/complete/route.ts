import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { getFullInspection } from "@/lib/inspection-service";
import { computeValidationSummary } from "@/lib/validation-summary";
import { normalizeInspectionText } from "@/lib/normalize-inspection-text";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const inspection = await getFullInspection(id);
    if (!inspection) throw new ApiError(404, "Obhliadka nebola nájdená");

    const summary = computeValidationSummary(inspection);
    if (!summary.canComplete) {
      throw new ApiError(400, "Obhliadku nie je možné dokončiť, kým nie sú vyriešené blokujúce chyby");
    }

    // Tidy the technician's on-site typing into report-quality Slovak before the protocol is
    // frozen. Runs before the status flip so a completed protocol is never half-normalised.
    const normalizedRows = await normalizeInspectionText(id);

    const updated = await db.inspection.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json({ ...updated, normalizedRows });
  } catch (error) {
    return jsonError(error);
  }
}
