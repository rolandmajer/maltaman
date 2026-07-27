import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { loadElementCondition, copyConditionToRoom } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string; conditionId: string };

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId, conditionId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadElementCondition(conditionId, elementId, roomId, id);

    const { targetRoomId } = await req.json();
    if (typeof targetRoomId !== "string" || !targetRoomId) throw new ApiError(400, "Chýba cieľová miestnosť");
    const targetRoom = await db.room.findUnique({ where: { id: targetRoomId } });
    if (!targetRoom || targetRoom.inspectionId !== id) throw new ApiError(404, "Cieľová miestnosť nebola nájdená");

    const copied = await copyConditionToRoom(conditionId, targetRoomId);
    return NextResponse.json(copied, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
