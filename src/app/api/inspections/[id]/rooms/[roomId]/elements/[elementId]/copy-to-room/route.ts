import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { loadRoomElement, copyElementAssessmentToRoom } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string };

/** "Copy this assessment to another room" — status/attributes overwritten, conditions appended. */
export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);

    const { targetRoomId } = await req.json();
    if (typeof targetRoomId !== "string" || !targetRoomId) throw new ApiError(400, "Chýba cieľová miestnosť");
    const targetRoom = await db.room.findUnique({ where: { id: targetRoomId } });
    if (!targetRoom || targetRoom.inspectionId !== id) throw new ApiError(404, "Cieľová miestnosť nebola nájdená");

    const copied = await copyElementAssessmentToRoom(elementId, targetRoomId);
    return NextResponse.json(copied);
  } catch (error) {
    return jsonError(error);
  }
}
