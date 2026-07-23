import { NextRequest, NextResponse } from "next/server";
import { requireInspectionAccess, requireSession, jsonError, ApiError } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { roomUpdateSchema } from "@/lib/validation";

async function loadRoom(roomId: string, inspectionId: string) {
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room || room.inspectionId !== inspectionId) throw new ApiError(404, "Miestnosť nebola nájdená");
  return room;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoom(roomId, id);
    const data = roomUpdateSchema.parse(await req.json());
    const updated = await db.room.update({ where: { id: roomId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; roomId: string }> }) {
  try {
    const user = await requireSession();
    const { id, roomId } = await ctx.params;
    await requireInspectionAccess(id, user.organisationId);
    await loadRoom(roomId, id);
    await db.room.delete({ where: { id: roomId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
