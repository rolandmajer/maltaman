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

    const { targetRoomIds } = await req.json();
    if (!Array.isArray(targetRoomIds) || targetRoomIds.some((v) => typeof v !== "string") || targetRoomIds.length === 0) {
      throw new ApiError(400, "Chýbajú cieľové miestnosti");
    }
    const targetRooms = await db.room.findMany({ where: { id: { in: targetRoomIds }, inspectionId: id } });
    if (targetRooms.length !== targetRoomIds.length) throw new ApiError(404, "Niektorá cieľová miestnosť nebola nájdená");

    const copied = [];
    for (const targetRoomId of targetRoomIds) {
      copied.push(await copyConditionToRoom(conditionId, targetRoomId));
    }
    return NextResponse.json(copied, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
