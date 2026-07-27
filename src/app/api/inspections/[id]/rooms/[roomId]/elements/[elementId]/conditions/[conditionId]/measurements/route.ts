import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { measurementSchema } from "@/lib/validation";
import { loadElementCondition } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string; conditionId: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId, conditionId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElementCondition(conditionId, elementId, roomId, id);
    const data = measurementSchema.parse(await req.json());
    const measurement = await db.measurement.create({ data: { ...data, elementConditionId: conditionId } });
    return NextResponse.json(measurement, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
