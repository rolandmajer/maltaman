import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { elementConditionUpdateSchema } from "@/lib/validation";
import { loadElementCondition } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string; conditionId: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId, conditionId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElementCondition(conditionId, elementId, roomId, id);
    const data = elementConditionUpdateSchema.parse(await req.json());
    const updated = await db.elementCondition.update({
      where: { id: conditionId },
      data,
      include: { measurements: true, photos: true, costItems: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId, conditionId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElementCondition(conditionId, elementId, roomId, id);
    await db.elementCondition.delete({ where: { id: conditionId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
