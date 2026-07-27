import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { elementConditionSchema } from "@/lib/validation";
import { loadRoomElement } from "@/lib/room-element-service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string; elementId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);
    const data = elementConditionSchema.parse(await req.json());

    const maxOrder = await db.elementCondition.aggregate({ where: { roomElementId: elementId }, _max: { order: true } });
    const condition = await db.elementCondition.create({
      data: { ...data, roomElementId: elementId, order: data.order ?? (maxOrder._max.order ?? -1) + 1 },
      include: { measurements: true, photos: true, costItems: true },
    });
    return NextResponse.json(condition, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
