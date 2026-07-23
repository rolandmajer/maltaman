import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { measurementSchema } from "@/lib/validation";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    const user = await requireSession();
    const { id, findingId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    const finding = await db.finding.findUnique({ where: { id: findingId } });
    if (!finding || finding.inspectionId !== id) throw new ApiError(404, "Zistenie nebolo nájdené");

    const data = measurementSchema.parse(await req.json());
    const measurement = await db.measurement.create({ data: { ...data, findingId } });
    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
