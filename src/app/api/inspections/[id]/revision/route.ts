import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { createRevision } from "@/lib/inspection-service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    const source = await requireInspectionAccess(id, user.organisationId);
    if (source.status !== "COMPLETED") {
      throw new ApiError(400, "Revíziu je možné vytvoriť len z dokončenej obhliadky");
    }
    const revision = await createRevision(id, user.id);
    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
