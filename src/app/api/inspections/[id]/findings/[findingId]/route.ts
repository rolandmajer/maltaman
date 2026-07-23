import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { findingUpdateSchema } from "@/lib/validation";

async function loadFinding(findingId: string, inspectionId: string) {
  const finding = await db.finding.findUnique({ where: { id: findingId } });
  if (!finding || finding.inspectionId !== inspectionId) throw new ApiError(404, "Zistenie nebolo nájdené");
  return finding;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    const user = await requireSession();
    const { id, findingId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadFinding(findingId, id);
    const data = findingUpdateSchema.parse(await req.json());
    const updated = await db.finding.update({ where: { id: findingId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    const user = await requireSession();
    const { id, findingId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadFinding(findingId, id);
    await db.finding.delete({ where: { id: findingId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
