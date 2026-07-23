import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { duplicateInspectionDeep } from "@/lib/inspection-service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const duplicated = await duplicateInspectionDeep(id, user.id);
    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
