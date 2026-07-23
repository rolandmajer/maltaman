import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { measurementUpdateSchema } from "@/lib/validation";

async function loadMeasurement(measurementId: string, inspectionId: string) {
  const measurement = await db.measurement.findUnique({
    where: { id: measurementId },
    include: { finding: true },
  });
  if (!measurement || measurement.finding.inspectionId !== inspectionId) {
    throw new ApiError(404, "Meranie nebolo nájdené");
  }
  return measurement;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; measurementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, measurementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadMeasurement(measurementId, id);
    const data = measurementUpdateSchema.parse(await req.json());
    const updated = await db.measurement.update({ where: { id: measurementId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; measurementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, measurementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadMeasurement(measurementId, id);
    await db.measurement.delete({ where: { id: measurementId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
