import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { loadRoomElement, applyElementAttributesToRooms } from "@/lib/room-element-service";

type Params = { id: string; roomId: string; elementId: string };

/** "Apply the same material/type to selected rooms" — copies this element's attributes only. */
export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const user = await requireSession();
    const { id, roomId, elementId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoomElement(elementId, roomId, id);

    const { targetRoomIds } = await req.json();
    if (!Array.isArray(targetRoomIds) || targetRoomIds.some((v) => typeof v !== "string") || targetRoomIds.length === 0) {
      throw new ApiError(400, "Chýbajú cieľové miestnosti");
    }
    const targetRooms = await db.room.findMany({ where: { id: { in: targetRoomIds }, inspectionId: id } });
    if (targetRooms.length !== targetRoomIds.length) throw new ApiError(404, "Niektorá cieľová miestnosť nebola nájdená");

    await applyElementAttributesToRooms(elementId, targetRoomIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
