import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { getFullInspection } from "@/lib/inspection-service";
import { computeValidationSummary } from "@/lib/validation-summary";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const inspection = await getFullInspection(id);
    if (!inspection) throw new ApiError(404, "Obhliadka nebola nájdená");
    return NextResponse.json(computeValidationSummary(inspection));
  } catch (error) {
    return jsonError(error);
  }
}
