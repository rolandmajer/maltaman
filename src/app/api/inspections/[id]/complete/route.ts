import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { getFullInspection } from "@/lib/inspection-service";
import { computeValidationSummary } from "@/lib/validation-summary";

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

    const updated = await db.inspection.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
